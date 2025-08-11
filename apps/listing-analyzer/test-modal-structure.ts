#!/usr/bin/env node
import { config } from 'dotenv'
import { resolve } from 'path'
import { writeFileSync } from 'fs'

// Load environment variables  
config({ path: resolve(__dirname, '.env.local') })

async function debugModalStructure() {
  const url = 'https://www.airbnb.com/rooms/1265375125128052388?check_in=2025-09-16&check_out=2025-09-30'
  const apiKey = process.env.BROWSERLESS_API_KEY
  
  if (!apiKey) {
    throw new Error('BROWSERLESS_API_KEY not configured')
  }
  
  console.log('🔍 Debugging Modal Structure')
  console.log(`📍 URL: ${url}`)
  console.log('=' .repeat(80))
  
  const functionEndpoint = `https://production-sfo.browserless.io/function?token=${apiKey}`
  
  const functionCode = `
export default async function({ page }) {
  const result = {
    modalStructure: {},
    screenshots: [],
    logs: [],
    error: null
  };
  
  try {
    const wait = async (ms) => {
      await page.evaluate((ms) => new Promise(resolve => setTimeout(resolve, ms)), ms);
    };
    
    // Navigate
    result.logs.push('Navigating to page...');
    await page.goto('${url}', { waitUntil: 'networkidle2' });
    await wait(3000);
    
    // Dismiss modals
    await page.keyboard.press('Escape');
    await wait(500);
    
    // Click on "Show all 29 reviews" button
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const reviewBtn = buttons.find(b => b.innerText && b.innerText.includes('Show all') && b.innerText.includes('reviews'));
      if (reviewBtn) {
        reviewBtn.click();
        return true;
      }
      
      // Fallback to clicking on review count
      const links = Array.from(document.querySelectorAll('a'));
      const reviewLink = links.find(a => a.innerText && a.innerText.match(/\\d+\\s+reviews?/i));
      if (reviewLink) {
        reviewLink.click();
        return true;
      }
      
      return false;
    });
    
    result.logs.push('Reviews button clicked: ' + clicked);
    
    if (clicked) {
      await wait(3000);
      
      // Get detailed modal structure
      result.modalStructure = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"]');
        if (!modal) return { exists: false };
        
        const structure = {
          exists: true,
          dimensions: {
            width: modal.offsetWidth,
            height: modal.offsetHeight,
            scrollHeight: modal.scrollHeight
          },
          textPreview: modal.innerText.substring(0, 500),
          imageCount: modal.querySelectorAll('img').length,
          divCount: modal.querySelectorAll('div').length,
          sections: []
        };
        
        // Find main sections within modal
        const mainDivs = Array.from(modal.children[0]?.children || []);
        
        mainDivs.forEach((section, index) => {
          const sectionInfo = {
            index,
            tag: section.tagName,
            className: section.className,
            textLength: section.innerText?.length || 0,
            textPreview: section.innerText?.substring(0, 200),
            hasImages: section.querySelectorAll('img').length > 0,
            imageCount: section.querySelectorAll('img').length,
            divCount: section.querySelectorAll('div').length
          };
          
          // Check if this section might contain reviews
          const text = section.innerText || '';
          sectionInfo.hasDatePattern = !!text.match(/(January|February|March|April|May|June|July|August|September|October|November|December|ago)/i);
          sectionInfo.hasStayInfo = text.includes('Stayed') || text.includes('nights');
          sectionInfo.hasRatingInfo = text.includes('star') || text.includes('Rating');
          
          structure.sections.push(sectionInfo);
        });
        
        // Try to find the scrollable container
        const scrollableContainer = modal.querySelector('[style*="overflow"]');
        if (scrollableContainer) {
          structure.scrollableContainer = {
            found: true,
            scrollHeight: scrollableContainer.scrollHeight,
            clientHeight: scrollableContainer.clientHeight,
            canScroll: scrollableContainer.scrollHeight > scrollableContainer.clientHeight
          };
        }
        
        return structure;
      });
      
      result.logs.push('Modal structure captured');
      
      // Take initial screenshot
      const screenshot1 = await page.screenshot({
        type: 'jpeg',
        quality: 80,
        encoding: 'base64'
      });
      result.screenshots.push({ name: 'modal-initial', data: screenshot1 });
      
      // Try to scroll within modal
      const scrolled = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"]');
        if (!modal) return false;
        
        // Find scrollable element
        let scrollContainer = modal.querySelector('[style*="overflow"]');
        if (!scrollContainer) {
          // Try to find by checking computed styles
          const divs = modal.querySelectorAll('div');
          for (const div of divs) {
            const style = window.getComputedStyle(div);
            if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && 
                div.scrollHeight > div.clientHeight) {
              scrollContainer = div;
              break;
            }
          }
        }
        
        if (!scrollContainer) {
          scrollContainer = modal;
        }
        
        const before = scrollContainer.scrollTop;
        scrollContainer.scrollBy(0, 500);
        return {
          scrolled: scrollContainer.scrollTop > before,
          scrollTop: scrollContainer.scrollTop,
          scrollHeight: scrollContainer.scrollHeight
        };
      });
      
      result.logs.push('Scroll attempt: ' + JSON.stringify(scrolled));
      
      if (scrolled.scrolled) {
        await wait(1500);
        
        // Take screenshot after scroll
        const screenshot2 = await page.screenshot({
          type: 'jpeg',
          quality: 80,
          encoding: 'base64'
        });
        result.screenshots.push({ name: 'modal-scrolled', data: screenshot2 });
        
        // Check what's visible after scroll
        const afterScrollContent = await page.evaluate(() => {
          const modal = document.querySelector('[role="dialog"]');
          if (!modal) return null;
          
          // Look for elements with dates or review-like content
          const divs = Array.from(modal.querySelectorAll('div'));
          const reviewLikeDivs = divs.filter(div => {
            const text = div.innerText || '';
            return text.length > 50 && text.length < 1000 && 
                   (text.includes('ago') || text.includes('Stayed') || 
                    text.match(/(January|February|March|April|May|June|July|August|September|October|November|December)/i));
          });
          
          return {
            reviewLikeDivsCount: reviewLikeDivs.length,
            samples: reviewLikeDivs.slice(0, 3).map(div => ({
              text: div.innerText.substring(0, 200),
              hasImage: div.querySelector('img') !== null
            }))
          };
        });
        
        result.afterScrollContent = afterScrollContent;
      }
    }
    
  } catch (error) {
    result.error = error.message;
    result.logs.push('Error: ' + error.message);
  }
  
  return {
    data: result,
    type: 'application/json'
  };
}
  `.trim()
  
  try {
    console.log('📸 Analyzing modal structure...')
    
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
    
    if (!response.ok) {
      throw new Error(`Function API failed: ${response.statusText}`)
    }
    
    const result = await response.json()
    const data = result.data
    
    console.log('\n📋 Debug Logs:')
    data.logs?.forEach((log: string) => console.log(`  - ${log}`))
    
    if (data.modalStructure?.exists) {
      console.log('\n🪟 Modal Structure:')
      console.log('  Dimensions:', data.modalStructure.dimensions)
      console.log('  Image count:', data.modalStructure.imageCount)
      console.log('  Div count:', data.modalStructure.divCount)
      
      if (data.modalStructure.scrollableContainer) {
        console.log('\n📜 Scrollable Container:')
        console.log('  Found:', data.modalStructure.scrollableContainer.found)
        console.log('  Can scroll:', data.modalStructure.scrollableContainer.canScroll)
        console.log('  Scroll height:', data.modalStructure.scrollableContainer.scrollHeight)
      }
      
      console.log('\n📑 Modal Sections:')
      data.modalStructure.sections?.forEach((section: any) => {
        if (section.hasDatePattern || section.hasStayInfo) {
          console.log(`\n  Section ${section.index}:`)
          console.log(`    Text length: ${section.textLength}`)
          console.log(`    Has images: ${section.hasImages} (${section.imageCount})`)
          console.log(`    Has date pattern: ${section.hasDatePattern}`)
          console.log(`    Has stay info: ${section.hasStayInfo}`)
          console.log(`    Preview: ${section.textPreview?.substring(0, 100)}...`)
        }
      })
      
      if (data.afterScrollContent) {
        console.log('\n📄 After Scroll Content:')
        console.log('  Review-like divs found:', data.afterScrollContent.reviewLikeDivsCount)
        if (data.afterScrollContent.samples?.length > 0) {
          console.log('  Samples:')
          data.afterScrollContent.samples.forEach((sample: any, i: number) => {
            console.log(`    ${i + 1}. Has image: ${sample.hasImage}`)
            console.log(`       ${sample.text}`)
          })
        }
      }
    }
    
    // Save screenshots
    if (data.screenshots?.length > 0) {
      console.log(`\n💾 Saving ${data.screenshots.length} screenshots...`)
      data.screenshots.forEach((screenshot: any) => {
        const buffer = Buffer.from(screenshot.data, 'base64')
        const filename = `${screenshot.name}.jpg`
        writeFileSync(filename, buffer)
        console.log(`  - ${filename} saved`)
      })
    }
    
    console.log('\n' + '=' .repeat(80))
    console.log('✅ Modal structure analysis complete')
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

// Run debug
debugModalStructure().catch(console.error)