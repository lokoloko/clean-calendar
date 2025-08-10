// Debug Function API - Simple test to understand what's working
import { ComprehensiveAirbnbListing } from './types/listing'

export async function debugFunctionAPI(url: string): Promise<any> {
  const apiKey = process.env.BROWSERLESS_API_KEY
  
  if (!apiKey) {
    throw new Error('BROWSERLESS_API_KEY not configured')
  }
  
  console.log(`🔍 Starting Function API debug for: ${url}`)
  
  const functionEndpoint = `https://production-sfo.browserless.io/function?token=${apiKey}`
  
  // Very simple ESM module to test basic functionality
  const functionCode = `
export default async function({ page }) {
  const debug = {
    logs: [],
    data: {},
    errors: [],
    screenshots: {}
  };
  
  try {
    debug.logs.push('Function started');
    
    // Navigate to page
    debug.logs.push('Navigating to: ${url}');
    await page.goto('${url}', { waitUntil: 'networkidle2' });
    debug.logs.push('Page loaded');
    
    // Wait for content (using evaluate with setTimeout)
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));
    debug.logs.push('Waited 3 seconds');
    
    // Get page title
    const title = await page.title();
    debug.data.title = title;
    debug.logs.push('Got title: ' + title);
    
    // Check if we can find buttons
    const buttons = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      return allButtons.map(b => ({
        text: b.innerText?.substring(0, 50),
        ariaLabel: b.getAttribute('aria-label')?.substring(0, 50)
      })).filter(b => b.text || b.ariaLabel);
    });
    debug.data.buttonCount = buttons.length;
    debug.data.sampleButtons = buttons.slice(0, 5);
    debug.logs.push('Found ' + buttons.length + ' buttons');
    
    // Find amenities button specifically
    const amenitiesButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const found = buttons.find(b => 
        b.innerText && b.innerText.match(/Show all \\d+ amenities/i)
      );
      return found ? {
        found: true,
        text: found.innerText,
        visible: found.offsetParent !== null
      } : { found: false };
    });
    debug.data.amenitiesButton = amenitiesButton;
    debug.logs.push('Amenities button: ' + JSON.stringify(amenitiesButton));
    
    // Test screenshot capability
    try {
      debug.logs.push('Testing screenshot...');
      const screenshot = await page.screenshot({
        type: 'jpeg',
        quality: 50,
        encoding: 'base64',
        clip: { x: 0, y: 0, width: 400, height: 300 }
      });
      
      if (screenshot) {
        debug.screenshots.test = screenshot.substring(0, 100) + '...';
        debug.data.screenshotWorking = true;
        debug.logs.push('Screenshot successful (length: ' + screenshot.length + ')');
      } else {
        debug.data.screenshotWorking = false;
        debug.logs.push('Screenshot returned null');
      }
    } catch (screenshotError) {
      debug.errors.push('Screenshot error: ' + screenshotError.message);
      debug.data.screenshotWorking = false;
    }
    
    // Try to click amenities button if found
    if (amenitiesButton.found) {
      try {
        debug.logs.push('Attempting to click amenities button...');
        
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const btn = buttons.find(b => 
            b.innerText && b.innerText.match(/Show all \\d+ amenities/i)
          );
          if (btn) btn.click();
        });
        
        debug.logs.push('Click executed, waiting for modal...');
        
        // Wait a bit for modal
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
        
        // Check if modal appeared
        const modalExists = await page.evaluate(() => {
          const modal = document.querySelector('[role="dialog"], [aria-modal="true"]');
          return {
            exists: !!modal,
            text: modal ? modal.innerText?.substring(0, 200) : null
          };
        });
        
        debug.data.modalOpened = modalExists;
        debug.logs.push('Modal check: ' + JSON.stringify(modalExists.exists));
        
        // Try to capture modal screenshot
        if (modalExists.exists) {
          try {
            const modalScreenshot = await page.screenshot({
              type: 'jpeg',
              quality: 70,
              encoding: 'base64'
            });
            
            if (modalScreenshot) {
              debug.screenshots.modal = modalScreenshot.substring(0, 100) + '...';
              debug.data.modalScreenshotSize = modalScreenshot.length;
              debug.logs.push('Modal screenshot captured');
            }
          } catch (e) {
            debug.errors.push('Modal screenshot error: ' + e.message);
          }
        }
        
      } catch (clickError) {
        debug.errors.push('Click error: ' + clickError.message);
      }
    }
    
    debug.logs.push('Debug complete');
    
  } catch (error) {
    debug.errors.push('Main error: ' + error.message);
    debug.logs.push('Fatal error occurred');
  }
  
  return {
    data: debug,
    type: 'application/json'
  };
}
  `.trim()
  
  try {
    console.log('📡 Calling Browserless function API...')
    
    const response = await fetch(functionEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: functionCode,
        context: {}
      })
    })
    
    console.log(`📊 Response status: ${response.status}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Function API error:', errorText)
      throw new Error(`Function API failed: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    // Log all debug information
    console.log('\n📋 Debug Results:')
    console.log('=' .repeat(60))
    
    if (result.data) {
      console.log('\n📝 Logs:')
      result.data.logs?.forEach((log: string) => console.log(`  - ${log}`))
      
      console.log('\n📊 Data Collected:')
      console.log(`  Title: ${result.data.data?.title}`)
      console.log(`  Buttons found: ${result.data.data?.buttonCount}`)
      console.log(`  Amenities button: ${JSON.stringify(result.data.data?.amenitiesButton)}`)
      console.log(`  Screenshot working: ${result.data.data?.screenshotWorking}`)
      console.log(`  Modal opened: ${JSON.stringify(result.data.data?.modalOpened)}`)
      
      if (result.data.data?.sampleButtons) {
        console.log('\n  Sample buttons:')
        result.data.data.sampleButtons.forEach((btn: any, i: number) => {
          console.log(`    ${i + 1}. "${btn.text || btn.ariaLabel}"`)
        })
      }
      
      if (result.data.errors?.length > 0) {
        console.log('\n⚠️ Errors:')
        result.data.errors.forEach((err: string) => console.log(`  - ${err}`))
      }
      
      console.log('\n📸 Screenshots:')
      console.log(`  Test screenshot: ${result.data.screenshots?.test ? 'Success' : 'Failed'}`)
      console.log(`  Modal screenshot: ${result.data.screenshots?.modal ? 'Success' : 'Failed'}`)
      if (result.data.data?.modalScreenshotSize) {
        console.log(`  Modal screenshot size: ${result.data.data.modalScreenshotSize} bytes`)
      }
    } else {
      console.log('⚠️ No debug data returned')
      console.log('Raw result:', JSON.stringify(result))
    }
    
    console.log('=' .repeat(60))
    
    return result
    
  } catch (error) {
    console.error('❌ Debug function failed:', error)
    throw error
  }
}

// Test function
export async function testDebug() {
  const testUrl = 'https://www.airbnb.com/rooms/1438491833009688203?check_in=2025-09-16&check_out=2025-09-30'
  
  try {
    const result = await debugFunctionAPI(testUrl)
    return result
  } catch (error) {
    console.error('Test failed:', error)
    throw error
  }
}