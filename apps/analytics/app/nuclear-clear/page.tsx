'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NuclearClearPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Nuclear option - clear EVERYTHING
    const clearAllData = async () => {
      if (typeof window !== 'undefined') {
        console.log('🔥 NUCLEAR CLEAR: Removing all data...')
        
        // Clear server-side session data first
        try {
          const response = await fetch('/api/clear-data', {
            method: 'POST',
            credentials: 'same-origin'
          })
          if (response.ok) {
            console.log('✅ Server session cleared')
          }
        } catch (e) {
          console.error('Failed to clear server session:', e)
        }
        
        // Clear all localStorage
        try {
          localStorage.clear()
          console.log('✅ localStorage cleared')
        } catch (e) {
          console.error('Failed to clear localStorage:', e)
        }
        
        // Clear all sessionStorage
        try {
          sessionStorage.clear()
          console.log('✅ sessionStorage cleared')
        } catch (e) {
          console.error('Failed to clear sessionStorage:', e)
        }
        
        // Clear all cookies
        try {
          document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
          })
          console.log('✅ Cookies cleared')
        } catch (e) {
          console.error('Failed to clear cookies:', e)
        }
        
        // Clear IndexedDB
        if (window.indexedDB) {
          indexedDB.databases().then(databases => {
            databases.forEach(db => {
              if (db.name) {
                indexedDB.deleteDatabase(db.name)
                console.log(`✅ IndexedDB ${db.name} cleared`)
              }
            })
          }).catch(e => {
            console.error('Failed to clear IndexedDB:', e)
          })
        }
        
        // Clear cache storage
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => {
              caches.delete(name)
              console.log(`✅ Cache ${name} cleared`)
            })
          }).catch(e => {
            console.error('Failed to clear caches:', e)
          })
        }
        
        console.log('🎯 NUCLEAR CLEAR COMPLETE!')
        
        // Redirect after a short delay
        setTimeout(() => {
          router.push('/')
        }, 2000)
      }
    }
    
    clearAllData()
  }, [router])
  
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">☢️ NUCLEAR CLEAR IN PROGRESS</h1>
        <p className="text-xl mb-2">Removing ALL stored data...</p>
        <p className="text-sm opacity-70">You will be redirected to home page shortly</p>
        <div className="mt-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      </div>
    </div>
  )
}