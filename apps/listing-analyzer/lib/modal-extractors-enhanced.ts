// Enhanced modal extractors for comprehensive Airbnb data
import { Page } from 'puppeteer-core'
import { 
  findButtonByText, 
  clickWithHumanBehavior, 
  waitForModal, 
  closeModal,
  scrollModalContent 
} from './modal-extractors'

// Enhanced House Rules extraction with all details
export async function extractCompleteHouseRules(page: Page): Promise<any> {
  const rules: any = {
    checkIn: {
      time: '',
      type: '', // Self check-in, Meet and greet, etc.
      instructions: []
    },
    checkOut: {
      time: '',
      instructions: []
    },
    during: {
      smoking: null,
      pets: null,
      parties: null,
      visitors: null,
      commercialPhotography: null,
      quietHours: '',
      additionalRules: []
    },
    children: {
      allowed: true,
      notes: ''
    },
    damage: {
      securityDeposit: null,
      depositAmount: '',
      damagePolicy: ''
    },
    other: []
  }
  
  // Scroll to load all content
  let previousHeight = 0
  let currentHeight = 0
  let scrollAttempts = 0
  const maxScrolls = 10
  
  do {
    previousHeight = currentHeight
    
    // Extract visible rules
    const extractedData = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"], [aria-modal="true"]')
      if (!modal) return null
      
      const data: any = {
        sections: []
      }
      
      // Find all sections in the modal
      const sections = modal.querySelectorAll('section, div[class*="section"], div[id*="section"]')
      
      sections.forEach(section => {
        const sectionData: any = {
          title: '',
          items: []
        }
        
        // Get section title
        const heading = section.querySelector('h2, h3, div[class*="title"]')
        if (heading) {
          sectionData.title = heading.textContent?.trim() || ''
        }
        
        // Get all items in this section
        const items = section.querySelectorAll('div[dir="ltr"], li, div[class*="rule"], div[class*="item"]')
        items.forEach(item => {
          const text = item.textContent?.trim()
          if (text && text.length > 3 && text.length < 500) {
            // Check for specific rule patterns
            const ruleData: any = { text }
            
            // Check for icons or indicators
            const hasIcon = item.querySelector('svg, [aria-hidden="true"]')
            if (hasIcon) {
              const iconClass = hasIcon.getAttribute('class') || ''
              if (iconClass.includes('check') || iconClass.includes('allow')) {
                ruleData.allowed = true
              } else if (iconClass.includes('cross') || iconClass.includes('prohibit')) {
                ruleData.allowed = false
              }
            }
            
            sectionData.items.push(ruleData)
          }
        })
        
        if (sectionData.items.length > 0) {
          data.sections.push(sectionData)
        }
      })
      
      // Also extract any standalone rules
      const allText = modal.textContent || ''
      
      // Extract times
      const checkInMatch = allText.match(/Check[- ]?in:?\s*([0-9]+:?[0-9]*\s*[APM]+(?:\s*-\s*[0-9]+:?[0-9]*\s*[APM]+)?)/i)
      const checkOutMatch = allText.match(/Check[- ]?out:?\s*([0-9]+:?[0-9]*\s*[APM]+)/i)
      
      data.checkInTime = checkInMatch ? checkInMatch[1] : ''
      data.checkOutTime = checkOutMatch ? checkOutMatch[1] : ''
      
      // Extract specific rules
      data.rules = {
        smoking: allText.includes('No smoking') || allText.includes('Smoking is not allowed'),
        pets: allText.includes('No pets') || allText.includes('Pets are not allowed'),
        parties: allText.includes('No parties') || allText.includes('Parties are not allowed'),
        events: allText.includes('No events') || allText.includes('Events are not allowed'),
        visitors: allText.includes('No visitors') || allText.includes('Visitors are not allowed'),
        quietHours: allText.match(/Quiet hours:?\s*([0-9]+:?[0-9]*\s*[APM]+\s*-\s*[0-9]+:?[0-9]*\s*[APM]+)/i)?.[1] || ''
      }
      
      return data
    })
    
    if (extractedData) {
      // Process sections
      extractedData.sections?.forEach((section: any) => {
        const title = section.title.toLowerCase()
        
        if (title.includes('check') && title.includes('in')) {
          rules.checkIn.instructions = section.items.map((i: any) => i.text)
        } else if (title.includes('check') && title.includes('out')) {
          rules.checkOut.instructions = section.items.map((i: any) => i.text)
        } else if (title.includes('during') || title.includes('stay')) {
          section.items.forEach((item: any) => {
            rules.during.additionalRules.push(item.text)
          })
        } else if (title.includes('child')) {
          rules.children.notes = section.items.map((i: any) => i.text).join('. ')
        } else if (title.includes('damage') || title.includes('deposit')) {
          rules.damage.damagePolicy = section.items.map((i: any) => i.text).join('. ')
        } else {
          // Other rules
          section.items.forEach((item: any) => {
            rules.other.push(item.text)
          })
        }
      })
      
      // Set extracted values
      if (extractedData.checkInTime) rules.checkIn.time = extractedData.checkInTime
      if (extractedData.checkOutTime) rules.checkOut.time = extractedData.checkOutTime
      if (extractedData.rules) {
        rules.during.smoking = !extractedData.rules.smoking
        rules.during.pets = !extractedData.rules.pets
        rules.during.parties = !extractedData.rules.parties
        rules.during.visitors = !extractedData.rules.visitors
        rules.during.quietHours = extractedData.rules.quietHours
      }
    }
    
    // Scroll the modal
    currentHeight = await scrollModalContent(page)
    scrollAttempts++
    
    // Wait for new content
    await new Promise(resolve => setTimeout(resolve, 1000))
    
  } while (currentHeight > previousHeight && scrollAttempts < maxScrolls)
  
  console.log('Extracted house rules:', {
    checkIn: rules.checkIn.time,
    checkOut: rules.checkOut.time,
    rulesCount: rules.during.additionalRules.length + rules.other.length
  })
  
  return rules
}

// Extract Safety & Property information
export async function extractSafetyAndProperty(page: Page): Promise<any> {
  const safety: any = {
    safetyFeatures: [],
    propertyInfo: [],
    cameras: {
      hasSecurityCameras: false,
      locations: []
    },
    noiseMonitoring: false,
    weapons: [],
    dangerousAnimals: false,
    heights: {
      stairs: false,
      balcony: false,
      loft: false
    },
    waterFeatures: {
      pool: false,
      hotTub: false,
      lake: false,
      river: false
    },
    other: []
  }
  
  // Scroll and extract all content
  let previousHeight = 0
  let currentHeight = 0
  let scrollAttempts = 0
  const maxScrolls = 10
  
  do {
    previousHeight = currentHeight
    
    const extractedData = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"], [aria-modal="true"]')
      if (!modal) return null
      
      const data: any = {
        items: []
      }
      
      // Extract all safety and property items
      const items = modal.querySelectorAll('div[dir="ltr"], li, div[class*="item"]')
      
      items.forEach(item => {
        const text = item.textContent?.trim()
        if (text && text.length > 3 && text.length < 500) {
          // Check for specific safety patterns
          const itemData: any = { text }
          
          // Check for icons
          const icon = item.querySelector('svg, [aria-hidden="true"]')
          if (icon) {
            // Try to determine what type of safety item this is
            if (text.toLowerCase().includes('camera') || text.toLowerCase().includes('recording')) {
              itemData.type = 'camera'
            } else if (text.toLowerCase().includes('alarm') || text.toLowerCase().includes('detector')) {
              itemData.type = 'alarm'
            } else if (text.toLowerCase().includes('pool') || text.toLowerCase().includes('water')) {
              itemData.type = 'water'
            } else if (text.toLowerCase().includes('height') || text.toLowerCase().includes('stairs')) {
              itemData.type = 'height'
            }
          }
          
          data.items.push(itemData)
        }
      })
      
      // Check for specific patterns in full text
      const fullText = modal.textContent || ''
      
      data.patterns = {
        hasSecurityCameras: fullText.includes('Security camera') || fullText.includes('surveillance'),
        noiseMonitoring: fullText.includes('Noise') && fullText.includes('monitor'),
        pool: fullText.includes('Pool') || fullText.includes('Swimming'),
        hotTub: fullText.includes('Hot tub') || fullText.includes('Jacuzzi'),
        stairs: fullText.includes('Stairs without') || fullText.includes('Steep stairs'),
        balcony: fullText.includes('Balcony') || fullText.includes('Patio'),
        weapons: fullText.includes('Weapons on property')
      }
      
      return data
    })
    
    if (extractedData) {
      // Process items
      extractedData.items?.forEach((item: any) => {
        const text = item.text
        const type = item.type
        
        if (type === 'camera') {
          safety.cameras.hasSecurityCameras = true
          safety.cameras.locations.push(text)
        } else if (type === 'alarm' || text.includes('alarm') || text.includes('detector')) {
          safety.safetyFeatures.push(text)
        } else if (type === 'water') {
          if (text.includes('Pool')) safety.waterFeatures.pool = true
          if (text.includes('Hot tub')) safety.waterFeatures.hotTub = true
          if (text.includes('Lake')) safety.waterFeatures.lake = true
          if (text.includes('River')) safety.waterFeatures.river = true
        } else if (type === 'height') {
          if (text.includes('Stairs')) safety.heights.stairs = true
          if (text.includes('Balcony')) safety.heights.balcony = true
          if (text.includes('Loft')) safety.heights.loft = true
        } else if (text.includes('Property info')) {
          safety.propertyInfo.push(text)
        } else {
          safety.other.push(text)
        }
      })
      
      // Apply patterns
      if (extractedData.patterns) {
        safety.cameras.hasSecurityCameras = safety.cameras.hasSecurityCameras || extractedData.patterns.hasSecurityCameras
        safety.noiseMonitoring = extractedData.patterns.noiseMonitoring
        safety.waterFeatures.pool = safety.waterFeatures.pool || extractedData.patterns.pool
        safety.waterFeatures.hotTub = safety.waterFeatures.hotTub || extractedData.patterns.hotTub
        safety.heights.stairs = safety.heights.stairs || extractedData.patterns.stairs
        safety.heights.balcony = safety.heights.balcony || extractedData.patterns.balcony
      }
    }
    
    // Scroll the modal
    currentHeight = await scrollModalContent(page)
    scrollAttempts++
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
  } while (currentHeight > previousHeight && scrollAttempts < maxScrolls)
  
  console.log('Extracted safety & property:', {
    safetyFeatures: safety.safetyFeatures.length,
    cameras: safety.cameras.hasSecurityCameras,
    propertyInfo: safety.propertyInfo.length
  })
  
  return safety
}

// Extract Cancellation Policy details
export async function extractCancellationPolicy(page: Page): Promise<any> {
  const policy: any = {
    type: '', // Flexible, Moderate, Strict, etc.
    summary: '',
    timeline: [],
    refundDetails: [],
    specialConditions: [],
    longStayPolicy: '',
    nonRefundableFees: []
  }
  
  const extractedData = await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"], [aria-modal="true"]')
    if (!modal) return null
    
    const data: any = {
      title: '',
      sections: []
    }
    
    // Get policy type from title
    const title = modal.querySelector('h1, h2, div[class*="title"]')
    if (title) {
      data.title = title.textContent?.trim() || ''
    }
    
    // Find all policy sections
    const sections = modal.querySelectorAll('section, div[class*="section"], div[role="region"]')
    
    sections.forEach(section => {
      const sectionData: any = {
        heading: '',
        content: []
      }
      
      // Get section heading
      const heading = section.querySelector('h3, div[class*="heading"]')
      if (heading) {
        sectionData.heading = heading.textContent?.trim() || ''
      }
      
      // Get timeline items (usually in lists)
      const timelineItems = section.querySelectorAll('li, div[class*="timeline"], div[class*="policy"]')
      timelineItems.forEach(item => {
        const text = item.textContent?.trim()
        if (text && text.length > 5) {
          // Check for refund percentages
          const percentMatch = text.match(/(\d+)%/)
          const timeMatch = text.match(/(\d+)\s*(hours?|days?|weeks?)/i)
          
          sectionData.content.push({
            text,
            refundPercent: percentMatch ? parseInt(percentMatch[1]) : null,
            timeframe: timeMatch ? timeMatch[0] : null
          })
        }
      })
      
      // Get paragraphs for detailed explanations
      const paragraphs = section.querySelectorAll('p, div[dir="ltr"]')
      paragraphs.forEach(p => {
        const text = p.textContent?.trim()
        if (text && text.length > 20 && !sectionData.content.some((c: any) => c.text === text)) {
          sectionData.content.push({ text })
        }
      })
      
      if (sectionData.content.length > 0) {
        data.sections.push(sectionData)
      }
    })
    
    // Extract key patterns from full text
    const fullText = modal.textContent || ''
    
    // Determine policy type
    if (fullText.includes('Flexible') || fullText.includes('Full refund')) {
      data.policyType = 'Flexible'
    } else if (fullText.includes('Moderate')) {
      data.policyType = 'Moderate'
    } else if (fullText.includes('Strict')) {
      data.policyType = 'Strict'
    } else if (fullText.includes('Super Strict')) {
      data.policyType = 'Super Strict'
    } else if (fullText.includes('Long term')) {
      data.policyType = 'Long term'
    }
    
    // Extract non-refundable fees
    const feeMatches = fullText.match(/(?:cleaning fee|service fee|Airbnb fee)s?\s*(?:are|is)?\s*non[- ]?refundable/gi)
    data.nonRefundableFees = feeMatches || []
    
    return data
  })
  
  if (extractedData) {
    policy.type = extractedData.policyType || extractedData.title || 'Standard'
    
    // Process sections
    extractedData.sections?.forEach((section: any) => {
      const heading = section.heading.toLowerCase()
      
      if (heading.includes('cancel') || heading.includes('refund')) {
        section.content.forEach((item: any) => {
          if (item.refundPercent !== null) {
            policy.timeline.push({
              timeframe: item.timeframe,
              refundPercent: item.refundPercent,
              description: item.text
            })
          } else {
            policy.refundDetails.push(item.text)
          }
        })
      } else if (heading.includes('long') || heading.includes('monthly')) {
        policy.longStayPolicy = section.content.map((c: any) => c.text).join(' ')
      } else if (heading.includes('special') || heading.includes('condition')) {
        policy.specialConditions = section.content.map((c: any) => c.text)
      } else {
        // General summary
        section.content.forEach((item: any) => {
          if (!policy.summary && item.text.length > 50) {
            policy.summary = item.text
          }
        })
      }
    })
    
    policy.nonRefundableFees = extractedData.nonRefundableFees
  }
  
  // Sort timeline by timeframe
  policy.timeline.sort((a: any, b: any) => {
    const getDays = (tf: string) => {
      if (!tf) return 0
      const match = tf.match(/(\d+)\s*(hours?|days?|weeks?)/i)
      if (!match) return 0
      const num = parseInt(match[1])
      const unit = match[2].toLowerCase()
      if (unit.includes('hour')) return num / 24
      if (unit.includes('week')) return num * 7
      return num
    }
    return getDays(b.timeframe) - getDays(a.timeframe)
  })
  
  console.log('Extracted cancellation policy:', {
    type: policy.type,
    timelineItems: policy.timeline.length,
    hasLongStayPolicy: !!policy.longStayPolicy
  })
  
  return policy
}

// Extract full description/about this space
export async function extractFullDescription(page: Page): Promise<any> {
  const description: any = {
    overview: '',
    theSpace: '',
    guestAccess: '',
    otherThingsToNote: '',
    gettingAround: '',
    fullText: '',
    sections: []
  }
  
  // Scroll and extract all content
  let previousHeight = 0
  let currentHeight = 0
  let scrollAttempts = 0
  const maxScrolls = 10
  
  do {
    previousHeight = currentHeight
    
    const extractedData = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"], [aria-modal="true"]')
      if (!modal) return null
      
      const data: any = {
        sections: [],
        fullText: modal.textContent || ''
      }
      
      // Find all sections in the description modal
      const sections = modal.querySelectorAll('section, div[data-section-id], div[class*="section"]')
      
      sections.forEach(section => {
        const sectionData: any = {
          title: '',
          content: ''
        }
        
        // Get section title
        const heading = section.querySelector('h2, h3, div[class*="title"]')
        if (heading) {
          sectionData.title = heading.textContent?.trim() || ''
        }
        
        // Get section content
        const paragraphs = section.querySelectorAll('span[dir="ltr"], div[dir="ltr"], p')
        const texts: string[] = []
        
        paragraphs.forEach(p => {
          const text = p.textContent?.trim()
          // Avoid duplicates and filter out UI elements
          if (text && text.length > 10 && !texts.includes(text)) {
            texts.push(text)
          }
        })
        
        sectionData.content = texts.join('\n\n')
        
        if (sectionData.content) {
          data.sections.push(sectionData)
        }
      })
      
      // Also try to extract by looking for specific patterns
      const allText = modal.textContent || ''
      
      // Extract specific sections by keywords
      const patterns = [
        { key: 'theSpace', pattern: /About this space[\s\S]*?(?=Guest access|Other things|The neighborhood|Getting around|$)/i },
        { key: 'guestAccess', pattern: /Guest access[\s\S]*?(?=Other things|The neighborhood|Getting around|$)/i },
        { key: 'otherThings', pattern: /Other things to note[\s\S]*?(?=The neighborhood|Getting around|$)/i },
        { key: 'neighborhood', pattern: /The neighborhood[\s\S]*?(?=Getting around|$)/i },
        { key: 'gettingAround', pattern: /Getting around[\s\S]*?$/i }
      ]
      
      data.extractedSections = {}
      patterns.forEach(({ key, pattern }) => {
        const match = allText.match(pattern)
        if (match) {
          data.extractedSections[key] = match[0].trim()
        }
      })
      
      return data
    })
    
    if (extractedData) {
      // Process sections
      extractedData.sections?.forEach((section: any) => {
        const title = section.title.toLowerCase()
        
        if (title.includes('about this space') || title.includes('description')) {
          description.overview = section.content
        } else if (title.includes('the space')) {
          description.theSpace = section.content
        } else if (title.includes('guest access')) {
          description.guestAccess = section.content
        } else if (title.includes('other things')) {
          description.otherThingsToNote = section.content
        } else if (title.includes('getting around') || title.includes('transportation')) {
          description.gettingAround = section.content
        }
        
        description.sections.push(section)
      })
      
      // Apply extracted sections if not already filled
      if (extractedData.extractedSections) {
        if (!description.theSpace && extractedData.extractedSections.theSpace) {
          description.theSpace = extractedData.extractedSections.theSpace
        }
        if (!description.guestAccess && extractedData.extractedSections.guestAccess) {
          description.guestAccess = extractedData.extractedSections.guestAccess
        }
        if (!description.otherThingsToNote && extractedData.extractedSections.otherThings) {
          description.otherThingsToNote = extractedData.extractedSections.otherThings
        }
        if (!description.gettingAround && extractedData.extractedSections.gettingAround) {
          description.gettingAround = extractedData.extractedSections.gettingAround
        }
      }
      
      description.fullText = extractedData.fullText
    }
    
    // Scroll the modal
    currentHeight = await scrollModalContent(page)
    scrollAttempts++
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
  } while (currentHeight > previousHeight && scrollAttempts < maxScrolls)
  
  console.log('Extracted description:', {
    hasOverview: !!description.overview,
    hasTheSpace: !!description.theSpace,
    hasGuestAccess: !!description.guestAccess,
    sectionsCount: description.sections.length,
    fullTextLength: description.fullText.length
  })
  
  return description
}

// Main function to extract all additional modals
export async function extractAllAdditionalModals(page: Page): Promise<any> {
  const results: any = {
    description: null,
    houseRules: null,
    safetyProperty: null,
    cancellationPolicy: null
  }
  
  // Extract Full Description
  try {
    // Try to find description Show more button with specific selector first
    const altButton = await page.$('[data-section-id="DESCRIPTION"] button, [data-testid="show-more-description"]')
    if (altButton) {
      console.log('Found description button via selector, clicking...')
      await altButton.click()
      await new Promise(resolve => setTimeout(resolve, 1000))
    } else {
      // Fallback to text search but only in description section
      const descButton = await page.evaluateHandle(() => {
        const descSection = document.querySelector('[data-section-id="DESCRIPTION"]')
        if (!descSection) return null
        
        const buttons = descSection.querySelectorAll('button')
        for (const button of buttons) {
          const text = button.textContent || ''
          if (text.includes('Show more') && !text.includes('amenities')) {
            return button
          }
        }
        return null
      })
      
      if (descButton) {
        console.log('Found description show more button via text, clicking...')
        await clickWithHumanBehavior(page, descButton)
      }
    }
    
    if (await waitForModal(page)) {
      console.log('Description modal appeared, extracting...')
      results.description = await extractFullDescription(page)
      await closeModal(page)
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait after closing
    }
  } catch (e: any) {
    console.log('Could not extract full description:', e.message)
  }
  
  // Extract House Rules
  try {
    const rulesButton = await findButtonByText(page, 'Show more.*house rules|Show more.*rules|House rules')
    if (rulesButton) {
      console.log('Found house rules button, clicking...')
      await clickWithHumanBehavior(page, rulesButton)
      
      if (await waitForModal(page)) {
        console.log('House rules modal appeared, extracting...')
        results.houseRules = await extractCompleteHouseRules(page)
        await closeModal(page)
      }
    }
  } catch (e: any) {
    console.log('Could not extract house rules:', e.message)
  }
  
  // Extract Safety & Property
  try {
    const safetyButton = await findButtonByText(page, 'Show more.*safety|Safety.*property|Show more')
    if (safetyButton) {
      console.log('Found safety & property button, clicking...')
      await clickWithHumanBehavior(page, safetyButton)
      
      if (await waitForModal(page)) {
        console.log('Safety & property modal appeared, extracting...')
        results.safetyProperty = await extractSafetyAndProperty(page)
        await closeModal(page)
      }
    }
  } catch (e: any) {
    console.log('Could not extract safety & property:', e.message)
  }
  
  // Extract Cancellation Policy
  try {
    const cancelButton = await findButtonByText(page, 'cancellation.*policy|Show more.*cancel|Cancellation')
    if (cancelButton) {
      console.log('Found cancellation policy button, clicking...')
      await clickWithHumanBehavior(page, cancelButton)
      
      // Add timeout to prevent hanging
      const modalPromise = waitForModal(page)
      const timeoutPromise = new Promise<boolean>((resolve) => 
        setTimeout(() => resolve(false), 5000)
      )
      
      const modalAppeared = await Promise.race([modalPromise, timeoutPromise])
      
      if (modalAppeared) {
        console.log('Cancellation policy modal appeared, extracting...')
        results.cancellationPolicy = await extractCancellationPolicy(page)
        await closeModal(page)
      } else {
        console.log('Cancellation policy modal did not appear in time')
      }
    }
  } catch (e: any) {
    console.log('Could not extract cancellation policy:', e.message)
  }
  
  return results
}