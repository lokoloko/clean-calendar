// Quick test script to debug Airbnb scraping
const puppeteer = require('puppeteer-core')

async function testScrape() {
  const apiKey = process.env.BROWSERLESS_API_KEY
  const url = 'https://www.airbnb.com/rooms/1076109337505550145'
  
  console.log('Testing Airbnb scrape...')
  
  const browser = await puppeteer.connect({
    browserWSEndpoint: `wss://production-sfo.browserless.io?token=${apiKey}`
  })
  
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1920, height: 1080 })
    
    console.log('Navigating to:', url)
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    
    console.log('Page loaded, checking for h1...')
    
    // Try to find h1
    const h1Exists = await page.$('h1')
    console.log('h1 exists:', !!h1Exists)
    
    if (h1Exists) {
      const h1Text = await page.$eval('h1', el => el.textContent)
      console.log('h1 text:', h1Text)
    }
    
    // Check for alternative title selectors
    const titleSelectors = [
      'h1',
      '[data-testid="listing-title"]',
      'div[role="heading"]',
      'span[data-testid="title"]',
      '.title-class' // Replace with actual class if known
    ]
    
    for (const selector of titleSelectors) {
      const element = await page.$(selector)
      if (element) {
        const text = await page.$eval(selector, el => el.textContent)
        console.log(`Found with ${selector}:`, text?.substring(0, 100))
      }
    }
    
    // Check page title
    const pageTitle = await page.title()
    console.log('Page title:', pageTitle)
    
    // Check if we're on an error page
    const currentUrl = page.url()
    console.log('Current URL:', currentUrl)
    
    // Take a screenshot for debugging
    await page.screenshot({ path: '/tmp/airbnb-debug.png' })
    console.log('Screenshot saved to /tmp/airbnb-debug.png')
    
    // Check for any blocking elements
    const bodyText = await page.$eval('body', el => el.textContent?.substring(0, 500))
    console.log('Body text preview:', bodyText)
    
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await browser.close()
  }
}

testScrape()