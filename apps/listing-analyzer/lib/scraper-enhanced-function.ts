// Enhanced Function API Implementation with Quick Win Improvements
import { GoogleGenerativeAI } from '@google/generative-ai'
import { ComprehensiveAirbnbListing } from './types/listing'
import { extractRatingsFromScreenshot } from './extract-ratings-only'

interface ModalScreenshots {
  main?: string
  amenities?: string
  reviews?: string[]
  safety?: string
  cancellation?: string
  houseRules?: string
  description?: string
  structuredData?: any
}

interface ExtractedData {
  main?: any
  amenities?: any
  reviews?: any[]
  safety?: any
  cancellation?: any
  houseRules?: any
  description?: any
  structuredData?: any
}

export async function scrapeWithEnhancedFunction(url: string): Promise<ComprehensiveAirbnbListing> {
  const apiKey = process.env.BROWSERLESS_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
  
  if (!apiKey || !geminiKey) {
    throw new Error('API keys not configured')
  }
  
  const listingId = extractListingId(url)
  console.log(`🎯 Starting enhanced function scraping for listing ${listingId}`)
  
  try {
    // Step 1: Capture main page and modals using enhanced function
    console.log('📸 Capturing page and modals with improvements...')
    const screenshots = await captureAllScreenshotsEnhanced(url, apiKey)
    
    // Step 2: Extract data from screenshots using improved Vision AI
    const extractedData: ExtractedData = {}
    
    // Use structured data if available
    if (screenshots.structuredData) {
      console.log('📊 Using structured data from page')
      extractedData.structuredData = screenshots.structuredData
    }
    
    if (screenshots.main) {
      console.log('🤖 Extracting main page data with enhanced prompts...')
      extractedData.main = await extractWithEnhancedVision(screenshots.main, geminiKey, 'main')
    }
    
    // Use DOM-extracted amenities data if available
    if (screenshots.amenitiesData) {
      console.log('🏠 Using DOM-extracted amenities data...')
      extractedData.amenities = {
        amenities: screenshots.amenitiesData.available || [],
        unavailable: screenshots.amenitiesData.unavailable || [],
        categories: screenshots.amenitiesData.categories || {},
        count: screenshots.amenitiesData.totalCount || 0
      }
      console.log(`  ✅ Extracted ${extractedData.amenities.count} amenities from DOM`)
    } else if (screenshots.amenities) {
      console.log('🏠 Extracting amenities from screenshot...')
      extractedData.amenities = await extractWithEnhancedVision(screenshots.amenities, geminiKey, 'amenities')
    }
    
    // Extract review ratings from screenshots
    if (screenshots.reviews && screenshots.reviews.length > 0) {
      console.log('💬 Extracting review ratings from screenshot...')
      
      // Use our specialized rating extraction for the first screenshot
      const ratingSummary = await extractRatingsFromScreenshot(screenshots.reviews[0], geminiKey)
      
      if (ratingSummary) {
        console.log(`  ✅ Overall rating: ${ratingSummary.overallRating}`)
        console.log(`  ✅ Total reviews: ${ratingSummary.totalReviews}`)
        console.log(`  ✅ Categories: ${Object.values(ratingSummary.categoryRatings).filter(v => v > 0).length}`)
        
        // Store the rating data in a format compatible with our structure
        extractedData.reviews = [{
          overall: {
            rating: ratingSummary.overallRating,
            totalCount: ratingSummary.totalReviews,
            categories: ratingSummary.categoryRatings,
            guestFavorite: ratingSummary.guestFavorite
          },
          reviews: [] // Individual reviews would go here if we had them
        }]
      } else {
        // Fallback to Vision AI if rating extraction fails
        console.log('  ⚠️ Rating extraction failed, falling back to Vision AI...')
        extractedData.reviews = []
        for (let i = 0; i < screenshots.reviews.length; i++) {
          const reviewData = await extractWithEnhancedVision(screenshots.reviews[i], geminiKey, 'reviews', i)
          if (reviewData) extractedData.reviews.push(reviewData)
        }
      }
    } else if (screenshots.reviewsData) {
      // Use DOM-extracted data if available (shouldn't happen but kept for compatibility)
      console.log('💬 Using DOM-extracted reviews data...')
      extractedData.reviews = [{
        overall: screenshots.reviewsData.summary,
        reviews: screenshots.reviewsData.reviews
      }]
      console.log(`  ✅ Extracted ${screenshots.reviewsData.totalCount} reviews from DOM`)
    }
    
    if (screenshots.safety) {
      console.log('🛡️ Extracting safety info...')
      extractedData.safety = await extractWithEnhancedVision(screenshots.safety, geminiKey, 'safety')
    }
    
    if (screenshots.cancellation) {
      console.log('📋 Extracting cancellation policy...')
      extractedData.cancellation = await extractWithEnhancedVision(screenshots.cancellation, geminiKey, 'cancellation')
    }
    
    if (screenshots.houseRules) {
      console.log('📋 Extracting house rules...')
      extractedData.houseRules = await extractWithEnhancedVision(screenshots.houseRules, geminiKey, 'houseRules')
    }
    
    // Step 3: Structure the data with enhancements
    console.log('🔄 Structuring extracted data with improvements...')
    const listing = structureEnhancedData(extractedData, url)
    
    console.log(`✅ Enhanced scraping complete: ${listing.meta?.dataCompleteness}% data extracted`)
    console.log(`📊 Modals captured: ${listing.meta?.modalsCaptured}`)
    
    return listing
    
  } catch (error) {
    console.error('❌ Enhanced scraping failed:', error)
    throw error
  }
}

async function captureAllScreenshotsEnhanced(url: string, apiKey: string): Promise<any> {
  const functionEndpoint = `https://production-sfo.browserless.io/function?token=${apiKey}`
  
  // Enhanced ESM module code with Quick Win improvements
  const functionCode = `
export default async function({ page }) {
  const screenshots = {
    main: null,
    amenities: null,
    reviews: [],
    safety: null,
    cancellation: null,
    houseRules: null,
    structuredData: null
  };
  
  const logs = [];
  
  try {
    // Helper function for waiting
    const wait = async (ms) => {
      await page.evaluate((ms) => new Promise(resolve => setTimeout(resolve, ms)), ms);
    };
    
    // QUICK WIN 1: Better modal dismissal
    const dismissAllModals = async () => {
      try {
        logs.push('Dismissing all interfering modals...');
        
        await page.evaluate(() => {
          // Close translation modal
          const translationModal = document.querySelector('[aria-label*="Translation"]');
          if (translationModal) {
            const closeBtn = translationModal.querySelector('button');
            if (closeBtn) closeBtn.click();
          }
          
          // Close cookie modal
          const cookieModal = document.querySelector('[data-testid="cookie-policy-modal"]');
          if (cookieModal) {
            const acceptBtn = cookieModal.querySelector('button');
            if (acceptBtn) acceptBtn.click();
          }
          
          // Close any generic modal
          const genericClose = document.querySelector('button[aria-label*="Close"], button[aria-label*="Dismiss"]');
          if (genericClose) genericClose.click();
        });
        
        await wait(500);
        
        // Also try Escape key
        await page.keyboard.press('Escape');
        await wait(500);
        
        logs.push('Modals dismissed');
      } catch (e) {
        logs.push('Modal dismissal error: ' + e.message);
      }
    };
    
    // Navigate to page
    logs.push('Navigating to page...');
    await page.goto('${url}', { waitUntil: 'networkidle2' });
    await wait(3000);
    
    // QUICK WIN 2: Extract structured data from page
    try {
      logs.push('Extracting structured data...');
      screenshots.structuredData = await page.evaluate(() => {
        // Get JSON-LD structured data
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        const structuredData = scripts.map(s => {
          try {
            return JSON.parse(s.textContent);
          } catch (e) {
            return null;
          }
        }).filter(Boolean);
        
        // Also get meta tags
        const metaTags = {};
        document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]').forEach(meta => {
          const key = meta.getAttribute('property') || meta.getAttribute('name');
          const value = meta.getAttribute('content');
          if (key && value) metaTags[key] = value;
        });
        
        // Get data attributes
        const dataAttrs = {};
        const mainContent = document.querySelector('[data-plugin-in-point-id="TITLE_DEFAULT"]');
        if (mainContent) {
          Array.from(mainContent.attributes).forEach(attr => {
            if (attr.name.startsWith('data-')) {
              dataAttrs[attr.name] = attr.value;
            }
          });
        }
        
        return { structuredData, metaTags, dataAttrs };
      });
      logs.push('Structured data extracted');
    } catch (e) {
      logs.push('Structured data error: ' + e.message);
    }
    
    // Dismiss initial modals before capturing
    await dismissAllModals();
    
    // Capture main page screenshot with full scroll
    logs.push('Capturing main page with full content...');
    await page.evaluate(() => window.scrollTo(0, 0));
    await wait(1000);
    
    // QUICK WIN 3: Capture full page height
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    await page.setViewport({ width: 1280, height: Math.min(pageHeight, 10000) });
    
    screenshots.main = await page.screenshot({
      type: 'jpeg',
      quality: 75,
      encoding: 'base64',
      fullPage: true
    });
    logs.push('Main page captured with full content');
    
    // Reset viewport
    await page.setViewport({ width: 1280, height: 800 });
    
    // AMENITIES MODAL - Enhanced with DOM extraction
    try {
      logs.push('Opening amenities modal...');
      
      // Dismiss any lingering modals first
      await dismissAllModals();
      
      // Scroll to amenities section first
      await page.evaluate(() => {
        const amenitiesSection = document.querySelector('[data-section-id="AMENITIES"]');
        if (amenitiesSection) amenitiesSection.scrollIntoView({ behavior: 'smooth' });
      });
      await wait(1000);
      
      // Find and click amenities button
      const amenitiesClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => {
          const text = b.innerText || '';
          return text.match(/Show all \\d+ amenities/i) || 
                 text.match(/Show \\d+ amenities/i) ||
                 text.includes('amenities');
        });
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });
      
      if (amenitiesClicked) {
        await wait(2500); // Give modal time to fully render
        
        // Check if correct modal opened
        const modalContent = await page.evaluate(() => {
          const modal = document.querySelector('[role="dialog"]');
          return modal ? modal.innerText.substring(0, 100) : null;
        });
        
        logs.push('Modal content preview: ' + (modalContent || 'empty'));
        
        // If it's not the amenities modal, dismiss and try again
        if (modalContent && !modalContent.toLowerCase().includes('amenities') && 
            modalContent.toLowerCase().includes('translation')) {
          logs.push('Wrong modal opened, dismissing and retrying...');
          await dismissAllModals();
          await wait(1000);
          
          // Try clicking again
          await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const btn = buttons.find(b => b.innerText && b.innerText.match(/amenities/i));
            if (btn) btn.click();
          });
          await wait(2000);
        }
        
        const modalExists = await page.$('[role="dialog"]');
        if (modalExists) {
          logs.push('Amenities modal opened, extracting all amenities...');
          
          // BETTER APPROACH: Extract amenities directly from DOM
          const amenitiesData = await page.evaluate(() => {
            const modal = document.querySelector('[role="dialog"]');
            if (!modal) return null;
            
            // Extract all list items (amenities)
            const listItems = Array.from(modal.querySelectorAll('li'));
            const amenities = [];
            const unavailable = [];
            
            listItems.forEach(li => {
              const text = li.innerText?.trim();
              if (text && text.length > 2) {
                if (text.startsWith('Unavailable:')) {
                  // Extract unavailable amenity name
                  const parts = text.split('\\n');
                  const name = parts[0].replace('Unavailable: ', '');
                  unavailable.push(name);
                } else if (!text.includes('Unavailable')) {
                  // Available amenity - clean up any description
                  const parts = text.split('\\n');
                  amenities.push(parts[0]);
                }
              }
            });
            
            // Also extract categories
            const categories = {};
            let currentCategory = null;
            
            const allElements = Array.from(modal.querySelectorAll('h3, li'));
            allElements.forEach(el => {
              if (el.tagName === 'H3') {
                currentCategory = el.innerText?.trim();
                if (currentCategory && !categories[currentCategory]) {
                  categories[currentCategory] = [];
                }
              } else if (el.tagName === 'LI' && currentCategory) {
                const text = el.innerText?.trim();
                if (text && !text.startsWith('Unavailable')) {
                  const parts = text.split('\\n');
                  if (parts[0] && parts[0].length > 2) {
                    categories[currentCategory].push(parts[0]);
                  }
                }
              }
            });
            
            return {
              available: amenities,
              unavailable: unavailable,
              categories: categories,
              totalCount: amenities.length
            };
          });
          
          // Store the extracted data in structured format
          screenshots.amenitiesData = amenitiesData;
          logs.push('Extracted ' + (amenitiesData?.totalCount || 0) + ' available amenities from DOM');
          
          // Still take screenshot for visual reference (multiple shots while scrolling)
          const modalScreenshots = [];
          
          // Reset scroll to top
          await page.evaluate(() => {
            const modal = document.querySelector('[role="dialog"]');
            if (modal) {
              const scrollable = modal.querySelector('[style*="overflow"]') || modal;
              scrollable.scrollTop = 0;
            }
          });
          await wait(500);
          
          // Take multiple screenshots while scrolling
          for (let i = 0; i < 3; i++) {
            const screenshot = await page.screenshot({
              type: 'jpeg',
              quality: 85,
              encoding: 'base64',
              fullPage: false
            });
            modalScreenshots.push(screenshot);
            
            // Scroll down
            const scrolled = await page.evaluate(() => {
              const modal = document.querySelector('[role="dialog"]');
              if (!modal) return false;
              const scrollable = modal.querySelector('[style*="overflow"]') || modal;
              const before = scrollable.scrollTop;
              scrollable.scrollBy(0, 400);
              return scrollable.scrollTop > before;
            });
            
            if (!scrolled) break;
            await wait(500);
          }
          
          // Combine screenshots or use the first one
          screenshots.amenities = modalScreenshots[0];
          screenshots.amenitiesScreenshots = modalScreenshots;
          
          await dismissAllModals();
        }
      }
    } catch (e) {
      logs.push('Amenities error: ' + e.message);
    }
    
    // REVIEWS MODAL - Enhanced with DOM extraction and better scrolling
    try {
      logs.push('Opening reviews modal...');
      
      await dismissAllModals();
      
      const reviewsClicked = await page.evaluate(() => {
        // Try multiple selectors (fixed - removed invalid :has-text selector)
        const selectors = [
          'a[href*="/reviews"]',
          'button[aria-label*="review"]',
          '[data-testid*="review"]'
        ];
        
        for (const selector of selectors) {
          try {
            const element = document.querySelector(selector);
            if (element) {
              element.click();
              return true;
            }
          } catch (e) {}
        }
        
        // Fallback to text search
        const links = Array.from(document.querySelectorAll('a'));
        const link = links.find(a => a.href && a.href.includes('/reviews'));
        if (link) {
          link.click();
          return true;
        }
        
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.innerText && b.innerText.match(/\\d+ review/i));
        if (btn) {
          btn.click();
          return true;
        }
        
        return false;
      });
      
      if (reviewsClicked) {
        await wait(3000); // Give more time for modal to load
        
        const modalExists = await page.$('[role="dialog"]');
        if (modalExists) {
          logs.push('Reviews modal opened, waiting for content to load...');
          
          // Wait for review content to appear
          await wait(2000);
          
          // Extract review summary first
          const reviewSummary = await page.evaluate(() => {
            const modal = document.querySelector('[role="dialog"]');
            if (!modal) return null;
            
            const modalText = modal.innerText || '';
            
            // Extract overall rating
            const ratingMatch = modalText.match(/Rated.*?(\\d+\\.\\d+|\\d+)/);
            const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
            
            // Extract total count
            const countMatch = modalText.match(/(\\d+) of (\\d+) items showing/);
            const totalCount = countMatch ? parseInt(countMatch[2]) : null;
            
            // Extract category ratings
            const categories = {};
            const categoryPatterns = {
              'cleanliness': /Cleanliness.*?(\\d+\\.\\d+|\\d+)/i,
              'accuracy': /Accuracy.*?(\\d+\\.\\d+|\\d+)/i,
              'checkin': /Check-?in.*?(\\d+\\.\\d+|\\d+)/i,
              'communication': /Communication.*?(\\d+\\.\\d+|\\d+)/i,
              'location': /Location.*?(\\d+\\.\\d+|\\d+)/i,
              'value': /Value.*?(\\d+\\.\\d+|\\d+)/i
            };
            
            Object.entries(categoryPatterns).forEach(([key, pattern]) => {
              const match = modalText.match(pattern);
              if (match) {
                categories[key] = parseFloat(match[1]);
              }
            });
            
            return { rating, totalCount, categories };
          });
          
          screenshots.reviewSummary = reviewSummary;
          logs.push('Review summary: ' + JSON.stringify(reviewSummary));
          
          // Find and scroll the actual scrollable area in the modal
          await page.evaluate(() => {
            const modal = document.querySelector('[role="dialog"]');
            if (!modal) return;
            
            // The modal structure often has the scrollable content deeper in the DOM
            // Try multiple strategies to find the scrollable container
            let scrollContainer = null;
            
            // Strategy 1: Look for element with overflow styles
            const allDivs = modal.querySelectorAll('div');
            for (const div of allDivs) {
              const style = window.getComputedStyle(div);
              if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && 
                  div.scrollHeight > div.clientHeight) {
                scrollContainer = div;
                break;
              }
            }
            
            // Strategy 2: Look for the largest container that might be scrollable
            if (!scrollContainer) {
              const containers = Array.from(modal.querySelectorAll('div')).filter(div => {
                return div.scrollHeight > 500; // Likely to contain reviews
              });
              if (containers.length > 0) {
                scrollContainer = containers[0];
              }
            }
            
            // Strategy 3: Just try the modal itself
            if (!scrollContainer) {
              scrollContainer = modal;
            }
            
            // Scroll to show reviews (past the rating section)
            scrollContainer.scrollBy(0, 600);
          });
          await wait(1500);
          
          // Extract all reviews with DOM parsing and scrolling
          const allReviews = [];
          const seenReviews = new Set();
          let scrollAttempts = 0;
          const maxScrolls = 10;
          
          while (scrollAttempts < maxScrolls) {
            // Extract visible reviews from DOM with improved parsing
            const visibleReviews = await page.evaluate(() => {
              const modal = document.querySelector('[role="dialog"]');
              if (!modal) return [];
              
              const reviews = [];
              const processedTexts = new Set();
              
              // Strategy 1: Look for review containers with avatar images
              const allDivs = Array.from(modal.querySelectorAll('div'));
              
              // Find containers that likely contain reviews (have avatar + text)  
              const potentialReviews = allDivs.filter(div => {
                // Look for any image that might be an avatar
                const hasAvatar = div.querySelector('img');
                const text = div.innerText || '';
                const hasReviewContent = text.length > 30 && text.length < 3000;
                
                // More flexible review detection - look for date patterns OR stay info
                const hasDatePattern = text.match(/(January|February|March|April|May|June|July|August|September|October|November|December)/i) || 
                                       text.match(/\\d+\\s+(days?|weeks?|months?)\\s+ago/i);
                const hasStayInfo = text.includes('Stayed') || text.includes('nights') || text.includes('week');
                
                // Exclude overall rating and category rating sections
                const isRatingSection = text.includes('Overall rating') || 
                                       text.includes('Cleanliness') && text.includes('Accuracy') && text.includes('Location');
                
                return hasAvatar && hasReviewContent && (hasDatePattern || hasStayInfo) && !isRatingSection;
              });
              
              potentialReviews.forEach(container => {
                const text = container.innerText || '';
                
                // Skip if we've already processed this text
                if (processedTexts.has(text)) return;
                processedTexts.add(text);
                
                const lines = text.split('\\n').map(l => l.trim()).filter(l => l);
                
                if (lines.length < 3) return;
                
                const review = {
                  name: '',
                  location: '',
                  date: '',
                  rating: 5,
                  text: '',
                  stayDuration: ''
                };
                
                let currentLine = 0;
                
                // Parse reviewer name (usually first line)
                review.name = lines[currentLine++] || '';
                
                // Parse location or "X years on Airbnb" (usually second line)
                if (currentLine < lines.length) {
                  const secondLine = lines[currentLine];
                  if (secondLine.includes(',') || secondLine.includes('on Airbnb')) {
                    review.location = secondLine;
                    currentLine++;
                  }
                }
                
                // Find the rating/date line
                let foundMetadata = false;
                for (let i = currentLine; i < Math.min(currentLine + 3, lines.length); i++) {
                  const line = lines[i];
                  
                  // This line contains rating and date info
                  if (line.includes('star') || line.includes('Rating')) {
                    // Extract rating
                    const ratingMatch = line.match(/(\\d+)\\s*star/i);
                    if (ratingMatch) {
                      review.rating = parseInt(ratingMatch[1]);
                    }
                    
                    // Extract date - look for month names or "ago" patterns
                    const monthMatch = line.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{4}/i);
                    const agoMatch = line.match(/(\\d+\\s+(weeks?|days?|months?)\\s+ago)/i);
                    
                    if (monthMatch) {
                      review.date = monthMatch[0];
                    } else if (agoMatch) {
                      review.date = agoMatch[0];
                    } else {
                      // Try to extract date from the line (e.g., "· July 2025 ·")
                      const dateSegment = line.split('·').find(segment => 
                        segment.match(/(January|February|March|April|May|June|July|August|September|October|November|December|\\d+\\s+(weeks?|days?|months?)\\s+ago)/i)
                      );
                      if (dateSegment) {
                        review.date = dateSegment.trim();
                      }
                    }
                    
                    // Extract stay duration if present
                    const stayMatch = line.match(/Stayed\\s+([^·]+)/i);
                    if (stayMatch) {
                      review.stayDuration = stayMatch[1].trim();
                    }
                    
                    foundMetadata = true;
                    currentLine = i + 1;
                    break;
                  }
                }
                
                // Collect review text
                const reviewTextLines = [];
                let inHostResponse = false;
                
                for (let i = currentLine; i < lines.length; i++) {
                  const line = lines[i];
                  
                  // Check for response marker
                  if (line.startsWith('Response from')) {
                    inHostResponse = true;
                    continue;
                  }
                  
                  // Stop at translation markers
                  if (line === 'Show original' || line.includes('Translated from')) {
                    break;
                  }
                  
                  // Skip metadata-like lines
                  if (line.includes('Stayed') && i === currentLine) {
                    review.stayDuration = line;
                    continue;
                  }
                  
                  if (!inHostResponse) {
                    reviewTextLines.push(line);
                  }
                }
                
                review.text = reviewTextLines.join(' ').trim();
                
                // Clean up text - remove any artifacts
                review.text = review.text
                  .replace(/^(great place|ok|clean place)/i, '')
                  .replace(/Rating,?\\s*\\d+\\s*stars?,?/gi, '')
                  .replace(/,\\s*·\\s*/g, ' ')
                  .replace(/^[,·\\s]+/, '')
                  .replace(/[,·\\s]+$/, '')
                  .trim();
                
                // Only add if we have valid content
                if (review.name && review.text && review.text.length > 5) {
                  reviews.push(review);
                }
              });
              
              // Fallback: If no reviews found with avatar method, try simpler text pattern
              if (reviews.length === 0) {
                const reviewBlocks = allDivs.filter(div => {
                  const text = div.innerText || '';
                  const hasName = text.split('\\n')[0]?.length < 50; // First line should be a name
                  const hasDateOrLocation = text.includes(',') || text.includes('ago') || text.includes('on Airbnb');
                  const hasReviewText = text.includes('Stayed') || (text.includes('star') && text.length > 100);
                  return hasName && hasDateOrLocation && hasReviewText && !processedTexts.has(text);
                });
                
                reviewBlocks.forEach(block => {
                  const text = block.innerText || '';
                  if (processedTexts.has(text)) return;
                  processedTexts.add(text);
                  
                  const lines = text.split('\\n').map(l => l.trim()).filter(l => l);
                  
                  if (lines.length >= 4) {
                    const review = {
                      name: lines[0],
                      location: lines[1].includes(',') || lines[1].includes('Airbnb') ? lines[1] : '',
                      date: '',
                      rating: 5,
                      text: '',
                      stayDuration: ''
                    };
                    
                    // Find metadata line
                    for (let i = 1; i < Math.min(5, lines.length); i++) {
                      if (lines[i].includes('star') || lines[i].includes('Stayed')) {
                        const dateMatch = lines[i].match(/(January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{4}|\\d+\\s+(weeks?|days?|months?)\\s+ago/i);
                        if (dateMatch) {
                          review.date = dateMatch[0];
                        }
                        
                        const stayMatch = lines[i].match(/Stayed\\s+([^·]+)/i);
                        if (stayMatch) {
                          review.stayDuration = stayMatch[1].trim();
                        }
                        
                        // Review text starts after metadata
                        review.text = lines.slice(i + 1)
                          .filter(l => !l.includes('Response from') && !l.includes('Translated from'))
                          .join(' ')
                          .trim();
                        break;
                      }
                    }
                    
                    if (review.text && review.text.length > 5) {
                      reviews.push(review);
                    }
                  }
                });
              }
              
              return reviews;
            });
            
            // Add unique reviews
            visibleReviews.forEach(review => {
              const key = review.name + review.date + (review.text || '').substring(0, 30);
              if (!seenReviews.has(key)) {
                seenReviews.add(key);
                allReviews.push(review);
              }
            });
            
            logs.push('Scroll ' + scrollAttempts + ': Found ' + visibleReviews.length + ' reviews, Total: ' + allReviews.length);
            
            // Take screenshot (only first 3)
            if (scrollAttempts < 3) {
              const screenshot = await page.screenshot({
                type: 'jpeg',
                quality: 85,
                encoding: 'base64',
                fullPage: false
              });
              screenshots.reviews.push(screenshot);
            }
            
            // Scroll for more reviews
            const scrolled = await page.evaluate(() => {
              const modal = document.querySelector('[role="dialog"]');
              if (!modal) return false;
              
              // Find the actual scrollable container
              let scrollContainer = null;
              const allDivs = modal.querySelectorAll('div');
              
              for (const div of allDivs) {
                const style = window.getComputedStyle(div);
                if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && 
                    div.scrollHeight > div.clientHeight) {
                  scrollContainer = div;
                  break;
                }
              }
              
              if (!scrollContainer) {
                scrollContainer = modal;
              }
              
              const before = scrollContainer.scrollTop;
              scrollContainer.scrollBy(0, 500);
              
              return scrollContainer.scrollTop > before;
            });
            
            if (!scrolled) {
              logs.push('No more reviews to scroll');
              break;
            }
            
            await wait(1500); // Wait for new content
            scrollAttempts++;
          }
          
          // Store extracted reviews data
          screenshots.reviewsData = {
            reviews: allReviews,
            totalCount: allReviews.length,
            summary: reviewSummary
          };
          
          logs.push('Extracted ' + allReviews.length + ' total reviews from DOM');
          
          await dismissAllModals();
        }
      }
    } catch (e) {
      logs.push('Reviews error: ' + e.message);
    }
    
    // OTHER MODALS - Same as before but with better dismissal
    const otherModals = [
      { 
        name: 'safety', 
        patterns: ['safety', 'property', 'Safety & property']
      },
      { 
        name: 'cancellation', 
        patterns: ['cancellation', 'Cancellation policy', 'refund']
      },
      { 
        name: 'houseRules', 
        patterns: ['house rules', 'House rules', 'rules']
      }
    ];
    
    for (const modalInfo of otherModals) {
      try {
        logs.push('Opening ' + modalInfo.name + ' modal...');
        
        await dismissAllModals();
        
        const clicked = await page.evaluate((patterns) => {
          const buttons = Array.from(document.querySelectorAll('button'));
          for (const pattern of patterns) {
            const btn = buttons.find(b => {
              const text = b.innerText || '';
              const aria = b.getAttribute('aria-label') || '';
              return text.toLowerCase().includes(pattern.toLowerCase()) ||
                     aria.toLowerCase().includes(pattern.toLowerCase());
            });
            if (btn) {
              btn.click();
              return true;
            }
          }
          return false;
        }, modalInfo.patterns);
        
        if (clicked) {
          await wait(2500);
          
          const modalExists = await page.$('[role="dialog"]');
          if (modalExists) {
            logs.push(modalInfo.name + ' modal opened, capturing...');
            screenshots[modalInfo.name] = await page.screenshot({
              type: 'jpeg',
              quality: 85,
              encoding: 'base64',
              fullPage: false
            });
            
            await dismissAllModals();
          }
        }
      } catch (e) {
        logs.push(modalInfo.name + ' error: ' + e.message);
      }
    }
    
    logs.push('All captures complete');
    
  } catch (error) {
    logs.push('Fatal error: ' + error.message);
  }
  
  // Count successful captures
  const captureCount = Object.values(screenshots).filter(v => 
    v !== null && (Array.isArray(v) ? v.length > 0 : true)
  ).length;
  
  return {
    data: {
      screenshots,
      logs,
      stats: {
        mainCaptured: !!screenshots.main,
        amenitiesCaptured: !!screenshots.amenities,
        amenitiesExtracted: screenshots.amenitiesData?.totalCount || 0,
        reviewsPages: screenshots.reviews.length,
        safetyCaptured: !!screenshots.safety,
        cancellationCaptured: !!screenshots.cancellation,
        houseRulesCaptured: !!screenshots.houseRules,
        hasStructuredData: !!screenshots.structuredData,
        totalModals: captureCount
      }
    },
    type: 'application/json'
  };
}
  `.trim()
  
  try {
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
    
    if (result.data) {
      console.log('📋 Capture logs:')
      result.data.logs?.forEach((log: string) => console.log(`  - ${log}`))
      
      console.log('\n📊 Capture stats:', result.data.stats)
      
      return result.data.screenshots
    }
    
    return {}
    
  } catch (error) {
    console.error('Error in function API:', error)
    throw error
  }
}

async function extractWithEnhancedVision(
  screenshotBase64: string, 
  geminiKey: string, 
  modalType: string,
  pageNum?: number
): Promise<any> {
  if (!screenshotBase64) return null
  
  console.log(`  Extracting ${modalType}... (${(screenshotBase64.length / 1024).toFixed(1)}KB)`)
  
  const genAI = new GoogleGenerativeAI(geminiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  
  // QUICK WIN: Much more specific prompts with examples
  const prompts = {
    main: `
      Analyze this Airbnb listing page screenshot and extract EXACTLY these fields.
      
      IMPORTANT: Look for these specific patterns:
      - Title: The large heading at the top of the page
      - Price: Look for "$" symbol followed by numbers (e.g., "$150" or "$150 night")
      - Location: Usually shown as "City, State, Country" format
      - Rating: Star symbol followed by number (e.g., "★ 4.95")
      - Reviews: Number followed by "reviews" (e.g., "28 reviews")
      - Host: Look for "Hosted by [Name]" or host section
      - Spaces: Look for "X guests · Y bedrooms · Z beds · W bath"
      
      Return ONLY this exact JSON structure:
      {
        "title": "exact title from page",
        "propertyType": "Entire place/Private room/Shared room/etc",
        "location": "City, State/Province, Country",
        "price": 150,
        "rating": 4.95,
        "reviewCount": 28,
        "host": {
          "name": "John",
          "isSuperhost": true
        },
        "spaces": {
          "guests": 4,
          "bedrooms": 2,
          "beds": 2,
          "bathrooms": 1
        }
      }
      
      If you cannot find a field, use null. Do not make up data.
    `,
    
    amenities: `
      This is an Airbnb amenities modal. Extract EVERY SINGLE amenity visible.
      
      Look for:
      - Items with icons next to text
      - List items in the modal
      - Categories like "Bathroom", "Kitchen", "Bedroom", etc.
      
      Common amenities include: Wifi, Kitchen, Parking, TV, Washer, Dryer, 
      Air conditioning, Heating, Pool, Hot tub, Workspace, Coffee maker, 
      Microwave, Refrigerator, Dishes, Hair dryer, Shampoo, etc.
      
      Return EXACTLY this JSON:
      {
        "amenities": ["Wifi", "Kitchen", "Free parking", ...list ALL items],
        "count": 21,
        "categories": {
          "basic": ["Wifi", "Kitchen", ...],
          "bathroom": ["Hair dryer", "Shampoo", ...],
          "bedroom": ["Hangers", "Iron", ...],
          "kitchen": ["Refrigerator", "Microwave", ...],
          "outdoor": ["Pool", "BBQ grill", ...]
        }
      }
    `,
    
    reviews: `
      Extract ALL reviews from this modal${pageNum ? ' (page ' + (pageNum + 1) + ')' : ''}.
      
      For each review, extract:
      - Reviewer name
      - Date (Month Year format)
      - Review text (complete text)
      - Any response from host
      
      ${pageNum === 0 ? `Also extract:
      - Overall rating (number with decimal)
      - Total review count
      - Category ratings (Cleanliness, Accuracy, etc.)` : ''}
      
      Return EXACTLY this JSON:
      {
        ${pageNum === 0 ? `"overall": {
          "rating": 4.95,
          "total": 150,
          "categories": {
            "cleanliness": 4.9,
            "accuracy": 4.8,
            "communication": 5.0,
            "location": 4.7,
            "checkIn": 4.9,
            "value": 4.8
          }
        },` : ''}
        "reviews": [
          {
            "name": "John",
            "date": "October 2024",
            "text": "Complete review text here...",
            "hostResponse": null
          }
        ]
      }
    `,
    
    safety: `
      Extract ALL safety and property information from this modal.
      
      Look for:
      - Safety features (smoke alarm, carbon monoxide detector, etc.)
      - Property info
      - Emergency information
      
      Return JSON with all visible safety details:
      {
        "safetyFeatures": ["Smoke alarm", "Carbon monoxide alarm", ...],
        "propertyInfo": ["2nd floor", "Private entrance", ...],
        "emergencyInfo": {...}
      }
    `,
    
    cancellation: `
      Extract the complete cancellation policy.
      
      Look for:
      - Policy type (Flexible, Moderate, Strict, etc.)
      - Refund timeline
      - Special conditions
      
      Return JSON:
      {
        "type": "Flexible/Moderate/Strict",
        "details": "Full refund if cancelled 24 hours before...",
        "timeline": {
          "fullRefund": "24 hours before",
          "partialRefund": "...",
          "noRefund": "..."
        }
      }
    `,
    
    houseRules: `
      Extract ALL house rules from this modal.
      
      Look for:
      - Check-in/Check-out times
      - Rules about pets, smoking, parties
      - Additional rules
      - Maximum guests
      
      Return JSON:
      {
        "checkIn": "3:00 PM",
        "checkOut": "11:00 AM",
        "rules": [
          "No smoking",
          "No pets",
          "No parties",
          ...
        ],
        "additionalRules": "...",
        "maxGuests": 4
      }
    `
  }
  
  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: screenshotBase64
        }
      },
      { text: prompts[modalType] || prompts.main }
    ])
    
    const response = await result.response
    const text = response.text()
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        console.log(`    ✅ Extracted ${Object.keys(parsed).length} fields from ${modalType}`)
        return parsed
      } catch (e) {
        console.log(`    ⚠️ Failed to parse JSON for ${modalType}`)
      }
    }
    
    return null
  } catch (error) {
    console.error(`    ❌ Vision extraction failed for ${modalType}:`, error)
    return null
  }
}

function structureEnhancedData(extractedData: ExtractedData, url: string): ComprehensiveAirbnbListing {
  const mainData = extractedData.main || {}
  const structuredData = extractedData.structuredData || {}
  
  // Use structured data to enhance extraction
  let enhancedData = { ...mainData }
  
  if (structuredData.metaTags) {
    // Extract from meta tags
    enhancedData.title = enhancedData.title || structuredData.metaTags['og:title']
    enhancedData.description = enhancedData.description || structuredData.metaTags['og:description']
    enhancedData.image = structuredData.metaTags['og:image']
  }
  
  // Collect all amenities with categories
  let allAmenities: string[] = []
  let amenityCategories = {}
  
  if (extractedData.amenities) {
    allAmenities = extractedData.amenities.amenities || []
    amenityCategories = extractedData.amenities.categories || {}
  }
  
  // Merge all reviews - handling both DOM-extracted and Vision AI formats
  let allReviews: any[] = []
  let reviewSummary: any = {}
  
  if (extractedData.reviews) {
    // Check if it's the new rating extraction format or DOM format
    if (extractedData.reviews.length > 0 && extractedData.reviews[0]?.overall) {
      const firstPage = extractedData.reviews[0]
      reviewSummary = firstPage.overall || {}
      
      // Check if we have individual reviews
      if (firstPage.reviews && Array.isArray(firstPage.reviews)) {
        allReviews = firstPage.reviews
      }
      
      // Add any reviews from additional pages
      for (let i = 1; i < extractedData.reviews.length; i++) {
        const page = extractedData.reviews[i]
        if (page?.reviews && Array.isArray(page.reviews)) {
          allReviews = allReviews.concat(page.reviews)
        }
      }
    }
    // Handle any other format
    else if (Array.isArray(extractedData.reviews)) {
      for (const page of extractedData.reviews) {
        if (page?.overall) {
          reviewSummary = page.overall
        }
        if (page?.reviews && Array.isArray(page.reviews)) {
          allReviews = allReviews.concat(page.reviews)
        }
      }
    }
  }
  
  // Calculate enhanced completeness
  const fieldsExtracted = 
    (enhancedData.title ? 5 : 0) +
    (enhancedData.location ? 5 : 0) +
    (enhancedData.host?.name ? 5 : 0) +
    (enhancedData.spaces ? 5 : 0) +
    (allAmenities.length * 2) + // More weight for amenities
    (allReviews.length * 2) + // More weight for reviews
    (extractedData.safety ? 5 : 0) +
    (extractedData.cancellation ? 5 : 0) +
    (extractedData.houseRules ? 5 : 0) +
    (structuredData.structuredData ? 10 : 0) // Bonus for structured data
  
  const dataCompleteness = Math.min(100, Math.round((fieldsExtracted / 100) * 100))
  
  // Count modals captured
  let modalsCaptured = 0
  if (extractedData.amenities) modalsCaptured++
  if (extractedData.reviews?.length > 0) modalsCaptured++
  if (extractedData.safety) modalsCaptured++
  if (extractedData.cancellation) modalsCaptured++
  if (extractedData.houseRules) modalsCaptured++
  
  return {
    id: extractListingId(url),
    url,
    title: enhancedData.title || 'Airbnb Listing',
    subtitle: enhancedData.subtitle,
    description: enhancedData.description || 'See listing',
    propertyType: enhancedData.propertyType || 'Place',
    
    guestCapacity: {
      adults: enhancedData.spaces?.guests || 2,
      children: 0,
      infants: 0,
      total: enhancedData.spaces?.guests || 2
    },
    
    spaces: {
      bedrooms: enhancedData.spaces?.bedrooms || 1,
      beds: enhancedData.spaces?.beds || 1,
      bathrooms: enhancedData.spaces?.bathrooms || 1
    },
    
    host: {
      name: enhancedData.host?.name || 'Host',
      isSuperhost: enhancedData.host?.isSuperhost || false
    },
    
    pricing: {
      basePrice: enhancedData.price || 150,
      currency: 'USD'
    },
    
    location: {
      city: enhancedData.location?.split(',')[0]?.trim() || 'Unknown',
      country: enhancedData.location?.split(',')[2]?.trim() || 
               enhancedData.location?.split(',')[1]?.trim() || 'Unknown'
    },
    
    photos: [],
    
    amenities: {
      basic: allAmenities,
      ...amenityCategories
    },
    
    reviews: allReviews.map(review => ({
      reviewer: review.name || review.reviewer || 'Anonymous',
      reviewerLocation: review.location || review.reviewerLocation || '',
      date: review.date || '',
      rating: review.rating || 5,
      review: review.text || review.review || '',
      stayDuration: review.stayDuration || '',
      hostResponse: review.hostResponse || null
    })),
    
    reviewsSummary: {
      averageRating: reviewSummary.rating || reviewSummary.overallRating || enhancedData.rating || 0,
      reviewCount: reviewSummary.totalCount || allReviews.length || 0,
      distribution: reviewSummary.distribution || { 5: allReviews.length, 4: 0, 3: 0, 2: 0, 1: 0 },
      categoryRatings: reviewSummary.categories || {
        cleanliness: reviewSummary.categories?.cleanliness || 0,
        accuracy: reviewSummary.categories?.accuracy || 0,
        communication: reviewSummary.categories?.communication || 0,
        location: reviewSummary.categories?.location || 0,
        checkIn: reviewSummary.categories?.checkin || reviewSummary.categories?.checkIn || 0,
        value: reviewSummary.categories?.value || 0
      }
    },
    
    houseRules: extractedData.houseRules || {
      checkIn: {},
      checkOut: {},
      during: {}
    },
    
    bookingSettings: {},
    
    cancellationPolicy: {
      type: extractedData.cancellation?.type || 'Standard',
      details: extractedData.cancellation?.details
    },
    
    safety: extractedData.safety,
    
    meta: {
      scrapedAt: new Date().toISOString(),
      scrapeVersion: 'enhanced-function-v1',
      dataCompleteness,
      modalsCaptured,
      hasStructuredData: !!structuredData.structuredData
    }
  }
}

function extractListingId(url: string): string {
  const match = url.match(/rooms\/(\d+)/)
  return match ? match[1] : ''
}