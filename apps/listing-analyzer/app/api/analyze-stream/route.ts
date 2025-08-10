import { NextRequest } from 'next/server'
import { scrapeAirbnbHybrid } from '@/lib/scraper-hybrid'
import { analyzeListingWithEnhancedAI } from '@/lib/analyzer-enhanced'

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  
  // Create a TransformStream for SSE
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()
  
  // Function to send SSE message
  const sendMessage = async (data: any) => {
    const message = `data: ${JSON.stringify(data)}\n\n`
    await writer.write(encoder.encode(message))
  }
  
  // Start processing in background
  (async () => {
    try {
      const body = await request.json()
      const { url } = body

      if (!url) {
        await sendMessage({ 
          type: 'error', 
          message: 'URL is required' 
        })
        await writer.close()
        return
      }

      // Validate Airbnb URL
      if (!url.includes('airbnb.com/rooms/') && !url.includes('airbnb.com/h/')) {
        await sendMessage({ 
          type: 'error', 
          message: 'Invalid Airbnb URL' 
        })
        await writer.close()
        return
      }

      // Stage 1: Initializing
      await sendMessage({
        type: 'status',
        stage: 'initializing',
        message: 'Starting analysis...',
        progress: 5
      })

      console.log('Starting streaming analysis for:', url)

      // Stage 2: Fetching
      await sendMessage({
        type: 'status',
        stage: 'fetching',
        message: 'Connecting to Airbnb and loading your listing...',
        progress: 10
      })

      // Create a custom scraper that sends updates
      const startTime = Date.now()
      
      // We'll need to modify the scraper to accept a callback
      // For now, simulate progress updates
      const scrapePromise = scrapeAirbnbHybrid(url)
      
      // Send periodic updates while scraping
      const updateInterval = setInterval(async () => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        const progress = Math.min(10 + (elapsed * 2), 60) // Cap at 60%
        
        if (elapsed < 20) {
          await sendMessage({
            type: 'status',
            stage: 'fetching',
            message: `Loading listing data... (${elapsed}s)`,
            progress
          })
        } else if (elapsed < 40) {
          await sendMessage({
            type: 'status',
            stage: 'extracting',
            message: `Extracting amenities, reviews, and photos... (${elapsed}s)`,
            progress
          })
        } else {
          await sendMessage({
            type: 'status',
            stage: 'extracting',
            message: `Processing complex data... (${elapsed}s)`,
            progress
          })
        }
      }, 2000)

      // Wait for scraping to complete
      const hybridResult = await scrapePromise
      clearInterval(updateInterval)
      
      const comprehensiveData = hybridResult.listing

      await sendMessage({
        type: 'status',
        stage: 'analyzing',
        message: 'Running AI analysis with Gemini...',
        progress: 70,
        details: {
          method: hybridResult.bestMethod,
          dataQuality: comprehensiveData.meta?.dataCompleteness || 0,
          itemsFound: {
            amenities: comprehensiveData.amenities?.basic?.length || 0,
            reviews: comprehensiveData.reviews?.summary?.totalCount || 0,
            photos: comprehensiveData.photos?.length || 0
          }
        }
      })

      // Stage 3: Analyzing
      const analysis = await analyzeListingWithEnhancedAI(comprehensiveData)

      await sendMessage({
        type: 'status',
        stage: 'finalizing',
        message: 'Generating recommendations...',
        progress: 90
      })

      // Add a small delay for UX
      await new Promise(resolve => setTimeout(resolve, 500))

      // Stage 4: Complete
      await sendMessage({
        type: 'complete',
        stage: 'done',
        message: 'Analysis complete!',
        progress: 100,
        data: {
          listing: comprehensiveData,
          analysis,
          metrics: {
            bestMethod: hybridResult.bestMethod,
            totalTime: hybridResult.totalTime,
            dataCompleteness: comprehensiveData.meta?.dataCompleteness || 0
          }
        }
      })

    } catch (error) {
      console.error('Streaming analysis error:', error)
      try {
        await sendMessage({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to analyze listing'
        })
      } catch (e) {
        console.error('Failed to send error message:', e)
      }
    } finally {
      try {
        await writer.close()
      } catch (e) {
        // Writer may already be closed
      }
    }
  })()

  // Return the stream as response
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}