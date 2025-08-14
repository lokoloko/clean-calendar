import { NextRequest, NextResponse } from 'next/server'

// Debug endpoint to check what's in storage
export async function GET(request: NextRequest) {
  // This runs on the server, so we can't access localStorage directly
  // But we can return info about what might be stored
  
  return NextResponse.json({
    message: 'Storage debug info',
    tip: 'Check browser console for localStorage/sessionStorage contents',
    clearInstructions: [
      '1. Open browser DevTools (F12)',
      '2. Go to Application tab',
      '3. Find Local Storage and Session Storage',
      '4. Clear all entries',
      '5. Or run in console: localStorage.clear(); sessionStorage.clear(); location.reload();'
    ]
  })
}

// Force clear endpoint
export async function DELETE(request: NextRequest) {
  // Return a response that includes a script to clear client storage
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Clearing Storage...</title>
    </head>
    <body>
      <h1>Clearing all storage...</h1>
      <script>
        // Clear everything
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear IndexedDB if it exists
        if (window.indexedDB) {
          indexedDB.databases().then(databases => {
            databases.forEach(db => {
              indexedDB.deleteDatabase(db.name);
            });
          });
        }
        
        // Clear cookies for this domain
        document.cookie.split(";").forEach(function(c) { 
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
        
        // Redirect to home
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      </script>
    </body>
    </html>
  `
  
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  })
}