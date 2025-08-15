'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface User {
  id: string
  email: string
  name?: string
}

export function AuthHeader() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      console.log('🔍 AuthHeader: Checking auth status...')
      const response = await fetch('/api/auth/check')
      if (response.ok) {
        const data = await response.json()
        console.log('✅ AuthHeader: User authenticated:', data.user?.email)
        setUser(data.user)
      } else {
        console.log('🚫 AuthHeader: User not authenticated')
      }
      // 401 is expected for unauthenticated users, not an error
    } catch (error) {
      // Only log actual network errors, not auth failures
      if (error instanceof TypeError) {
        console.error('Auth check failed:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  if (loading) {
    return (
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-3 flex items-center justify-end">
          <div className="h-8 w-20 bg-gray-200 animate-pulse rounded" />
        </div>
      </header>
    )
  }

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 py-3 flex items-center justify-end">
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <span className="text-sm text-gray-600">
                {user.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => router.push('/login')}
            >
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}