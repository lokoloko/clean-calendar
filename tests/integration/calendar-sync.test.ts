import { testPool, cleanDatabase, seedTestData } from './setup'
import { parseICalData } from '@/lib/ical-parser'
import { syncListingCalendar } from '@/lib/sync'

// Mock fetch for ICS data
global.fetch = jest.fn()

describe('Calendar Sync Integration', () => {
  beforeEach(async () => {
    await cleanDatabase()
    await seedTestData()
    jest.clearAllMocks()
  })

  it('should sync calendar and create schedule items', async () => {
    // Mock ICS data
    const mockIcsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Airbnb Inc//Hosting Calendar 0.8.8//EN
BEGIN:VEVENT
UID:123456@airbnb.com
DTSTART;VALUE=DATE:20240115
DTEND;VALUE=DATE:20240118
SUMMARY:Guest Name (RESERVATION)
END:VEVENT
END:VCALENDAR`

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: async () => mockIcsData,
    })

    // Sync the calendar
    const result = await syncListingCalendar('listing-1', 'test-user-id')

    expect(result.success).toBe(true)
    expect(result.itemsCreated).toBe(1)

    // Verify schedule item was created
    const { rows } = await testPool.query(
      'SELECT * FROM public.schedule_items WHERE listing_id = $1',
      ['listing-1']
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      listing_id: 'listing-1',
      check_in: expect.any(Date),
      check_out: expect.any(Date),
      guest_name: 'Guest Name',
      status: 'confirmed',
      source: 'airbnb',
    })
  })

  it('should handle sync errors gracefully', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    const result = await syncListingCalendar('listing-1', 'test-user-id')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Network error')
    expect(result.itemsCreated).toBe(0)
  })

  it('should not create duplicate bookings', async () => {
    const mockIcsData = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:duplicate-123@airbnb.com
DTSTART;VALUE=DATE:20240120
DTEND;VALUE=DATE:20240123
SUMMARY:Duplicate Guest
END:VEVENT
END:VCALENDAR`

    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => mockIcsData,
    })

    // First sync
    await syncListingCalendar('listing-1', 'test-user-id')
    
    // Second sync with same data
    const result = await syncListingCalendar('listing-1', 'test-user-id')

    expect(result.itemsCreated).toBe(0)

    // Verify only one item exists
    const { rows } = await testPool.query(
      'SELECT * FROM public.schedule_items WHERE external_id = $1',
      ['duplicate-123@airbnb.com']
    )

    expect(rows).toHaveLength(1)
  })
})