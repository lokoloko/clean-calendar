import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { addDays, addWeeks, addMonths, setDate, getDay, startOfDay, endOfDay } from 'date-fns'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { generateUntil } = body // Optional end date for generation

    // Get the manual schedule rule
    const ruleResult = await db.query(
      `SELECT * FROM public.manual_schedule_rules WHERE id = $1 AND is_active = true`,
      [params.id]
    )

    if (ruleResult.rows.length === 0) {
      return NextResponse.json({ error: 'Schedule rule not found or inactive' }, { status: 404 })
    }

    const rule = ruleResult.rows[0]
    
    // Calculate dates to generate
    const dates = generateDates(rule, generateUntil)
    
    // Check for existing schedule items
    const existingResult = await db.query(
      `SELECT check_out FROM public.schedule_items 
       WHERE listing_id = $1 AND source IN ('manual', 'manual_recurring')`,
      [rule.listing_id]
    )
    
    const existingDates = new Set(
      existingResult.rows.map(row => row.check_out.toISOString().split('T')[0])
    )

    // Create schedule items for non-existing dates
    let created = 0
    let skipped = 0
    
    for (const date of dates) {
      const dateStr = date.toISOString().split('T')[0]
      
      if (existingDates.has(dateStr)) {
        skipped++
        continue
      }

      await db.query(
        `INSERT INTO public.schedule_items 
         (listing_id, cleaner_id, check_in, check_out, checkout_time, 
          notes, status, source, manual_rule_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          rule.listing_id,
          rule.cleaner_id,
          dateStr, // For manual cleanings, check_in = check_out
          dateStr,
          rule.cleaning_time || '11:00',
          rule.notes || 'Manual cleaning',
          'pending',
          rule.schedule_type === 'recurring' ? 'manual_recurring' : 'manual',
          rule.id
        ]
      )
      created++
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      total: dates.length
    })
  } catch (error) {
    console.error('Error generating schedule:', error)
    return NextResponse.json(
      { error: 'Failed to generate schedule' },
      { status: 500 }
    )
  }
}

function generateDates(rule: any, generateUntil?: string): Date[] {
  const dates: Date[] = []
  const startDate = new Date(rule.start_date)
  const endDate = rule.end_date ? new Date(rule.end_date) : null
  const maxDate = generateUntil ? new Date(generateUntil) : addMonths(new Date(), 6)
  
  // Use the earlier of rule end date or generation end date
  const finalEndDate = endDate && endDate < maxDate ? endDate : maxDate

  if (rule.schedule_type === 'one_time') {
    dates.push(startDate)
    return dates
  }

  let currentDate = startOfDay(startDate)

  while (currentDate <= finalEndDate) {
    switch (rule.frequency) {
      case 'daily':
        dates.push(new Date(currentDate))
        currentDate = addDays(currentDate, 1)
        break
        
      case 'weekly':
        // Generate for each selected day of week
        if (rule.days_of_week && rule.days_of_week.length > 0) {
          const currentDayOfWeek = getDay(currentDate)
          if (rule.days_of_week.includes(currentDayOfWeek)) {
            dates.push(new Date(currentDate))
          }
        }
        currentDate = addDays(currentDate, 1)
        break
        
      case 'biweekly':
        // Similar to weekly but skip alternate weeks
        const weeksSinceStart = Math.floor((currentDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
        if (weeksSinceStart % 2 === 0 && rule.days_of_week && rule.days_of_week.includes(getDay(currentDate))) {
          dates.push(new Date(currentDate))
        }
        currentDate = addDays(currentDate, 1)
        break
        
      case 'monthly':
        // Generate on specific day of month
        if (rule.day_of_month) {
          const targetDate = setDate(currentDate, rule.day_of_month)
          if (targetDate.getMonth() === currentDate.getMonth() && targetDate >= startDate) {
            dates.push(new Date(targetDate))
          }
        }
        currentDate = addMonths(currentDate, 1)
        break
        
      case 'custom':
        // Generate based on custom interval
        dates.push(new Date(currentDate))
        currentDate = addDays(currentDate, rule.custom_interval_days || 1)
        break
    }
  }

  return dates
}