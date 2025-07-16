'use client'

import { createContext, useContext, useState } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  user_metadata?: {
    name?: string
    avatar_url?: string
  }
}

interface AuthContextType {
  user: User | null
  session: any
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Mock user for development
const mockUser: User = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'test@example.com',
  user_metadata: {
    name: 'Test User',
    avatar_url: ''
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null) // Start logged out
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const signInWithGoogle = async () => {
    // Mock sign in
    setUser(mockUser)
    // Set cookie for middleware
    document.cookie = 'dev-auth=true; path=/'
    router.push('/dashboard')
  }

  const signOut = async () => {
    setUser(null)
    // Remove cookie
    document.cookie = 'dev-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    router.push('/')
  }

  const value = {
    user,
    session: user ? { user } : null,
    loading,
    signInWithGoogle,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}