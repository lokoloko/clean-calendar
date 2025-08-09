import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Clear the localStorage to force recalculation
    const script = `
      // Get all properties from localStorage
      const stored = localStorage.getItem('gostudiom_properties');
      if (stored) {
        const data = JSON.parse(stored);
        
        // Clear metrics for all properties to force recalculation
        if (data.properties) {
          data.properties.forEach(prop => {
            // Clear calculated metrics but keep data sources
            delete prop.metrics;
          });
          
          // Save back to localStorage
          localStorage.setItem('gostudiom_properties', JSON.stringify(data));
          console.log('Cleared metrics for', data.properties.length, 'properties');
        }
      }
      
      // Reload the page to trigger recalculation
      window.location.reload();
    `;
    
    return new NextResponse(
      `<html>
        <head><title>Recalculating Metrics...</title></head>
        <body>
          <h1>Recalculating all property metrics...</h1>
          <p>This will clear cached metrics and force recalculation with the fixed logic.</p>
          <script>${script}</script>
        </body>
      </html>`,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  } catch (error) {
    return NextResponse.json({ error: 'Failed to recalculate' }, { status: 500 })
  }
}