'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Crown, User, Building } from 'lucide-react'
import { getUserTier, mockUpgradeToTier, type UserTier } from '@/lib/user-tier'

export function TierSelector() {
  const [currentTier, setCurrentTier] = useState<UserTier>('free')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const user = getUserTier()
    setCurrentTier(user.tier)
  }, [])

  const handleTierChange = (tier: UserTier) => {
    mockUpgradeToTier(tier)
    setCurrentTier(tier)
    setIsOpen(false)
    // Reload to apply new tier
    window.location.reload()
  }

  const getTierIcon = (tier: UserTier) => {
    switch (tier) {
      case 'free':
        return <User className="w-4 h-4" />
      case 'pro':
        return <Crown className="w-4 h-4" />
      case 'enterprise':
        return <Building className="w-4 h-4" />
    }
  }

  const getTierColor = (tier: UserTier) => {
    switch (tier) {
      case 'free':
        return 'text-gray-600'
      case 'pro':
        return 'text-purple-600'
      case 'enterprise':
        return 'text-blue-600'
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && (
        <Card className="absolute bottom-12 right-0 w-64 shadow-lg">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Test Tier Selection</h3>
            <div className="space-y-2">
              <Button
                variant={currentTier === 'free' ? 'default' : 'outline'}
                className="w-full justify-start"
                onClick={() => handleTierChange('free')}
              >
                <User className="w-4 h-4 mr-2" />
                Free Tier
              </Button>
              <Button
                variant={currentTier === 'pro' ? 'default' : 'outline'}
                className="w-full justify-start"
                onClick={() => handleTierChange('pro')}
              >
                <Crown className="w-4 h-4 mr-2" />
                Pro Tier
              </Button>
              <Button
                variant={currentTier === 'enterprise' ? 'default' : 'outline'}
                className="w-full justify-start"
                onClick={() => handleTierChange('enterprise')}
              >
                <Building className="w-4 h-4 mr-2" />
                Enterprise Tier
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={`${getTierColor(currentTier)} bg-white shadow-md`}
      >
        {getTierIcon(currentTier)}
        <span className="ml-2 capitalize">{currentTier}</span>
      </Button>
    </div>
  )
}