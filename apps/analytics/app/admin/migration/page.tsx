'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Database, 
  HardDrive, 
  ArrowRight, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Settings,
  Info,
  Download,
  Upload
} from 'lucide-react'
import { PropertyStore as PropertyStoreLocal } from '@/lib/storage/property-store'
import { PropertyStoreAdapter } from '@/lib/storage/property-store-adapter'
import { FeatureFlag, FeatureFlags } from '@/lib/features/feature-flags'

export default function MigrationPage() {
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle')
  const [progress, setProgress] = useState(0)
  const [localDataCount, setLocalDataCount] = useState(0)
  const [migratedCount, setMigratedCount] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [featureFlags, setFeatureFlags] = useState<Record<FeatureFlag, boolean>>({} as any)
  const [isMigrated, setIsMigrated] = useState(false)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = () => {
    // Check local data count
    const localProperties = PropertyStoreLocal.getAll()
    setLocalDataCount(localProperties.length)

    // Check migration status
    const migrationCompleted = PropertyStoreAdapter.isMigrationCompleted()
    setIsMigrated(migrationCompleted)
    if (migrationCompleted) {
      setMigrationStatus('completed')
    }

    // Load feature flags
    const flags = FeatureFlags.getAll()
    setFeatureFlags(flags)
  }

  const startMigration = async () => {
    setMigrationStatus('running')
    setProgress(0)
    setErrors([])
    setMigratedCount(0)

    // Enable migration flag
    FeatureFlags.setUserPreference(FeatureFlag.ENABLE_MIGRATION, true)
    
    // Enable dual-write mode for safety
    FeatureFlags.setUserPreference(FeatureFlag.DUAL_WRITE_MODE, true)

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90))
    }, 500)

    try {
      const result = await PropertyStoreAdapter.migrateToDatabase()
      
      clearInterval(progressInterval)
      setProgress(100)
      setMigratedCount(result.migratedCount)
      
      if (result.success) {
        setMigrationStatus('completed')
        setIsMigrated(true)
        
        // After successful migration, enable database mode
        setTimeout(() => {
          FeatureFlags.setUserPreference(FeatureFlag.USE_DATABASE_STORAGE, true)
          FeatureFlags.setUserPreference(FeatureFlag.DUAL_WRITE_MODE, false)
          checkStatus()
        }, 2000)
      } else {
        setMigrationStatus('failed')
        setErrors(result.errors)
      }
    } catch (error) {
      clearInterval(progressInterval)
      setMigrationStatus('failed')
      setErrors([`Unexpected error: ${error}`])
    }
  }

  const exportLocalData = () => {
    const data = PropertyStoreLocal.exportAll()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gostudiom_backup_${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  const toggleFeatureFlag = (flag: FeatureFlag) => {
    const newValue = !featureFlags[flag]
    FeatureFlags.setUserPreference(flag, newValue)
    setFeatureFlags({
      ...featureFlags,
      [flag]: newValue
    })
  }

  const clearLocalStorage = () => {
    if (confirm('Are you sure you want to clear all localStorage data? This cannot be undone.')) {
      PropertyStoreLocal.clear()
      localStorage.removeItem('gostudiom_migration_completed')
      checkStatus()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Data Migration Center</h1>
          <p className="text-gray-600">Migrate your property data from browser storage to cloud database</p>
        </div>

        {/* Migration Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Migration Status
            </CardTitle>
            <CardDescription>
              Transfer your data to enable multi-device access and improved performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Current State */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <HardDrive className="w-8 h-8 text-gray-600" />
                  <div>
                    <p className="font-medium">Local Storage</p>
                    <p className="text-sm text-gray-600">{localDataCount} properties</p>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-gray-400" />
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-medium">Cloud Database</p>
                    <p className="text-sm text-gray-600">
                      {isMigrated ? `${migratedCount || localDataCount} properties` : 'Not migrated'}
                    </p>
                  </div>
                  <Database className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              {/* Migration Progress */}
              {migrationStatus === 'running' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Migrating...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}

              {/* Status Alerts */}
              {migrationStatus === 'completed' && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Migration Completed</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Successfully migrated {migratedCount} properties to the database.
                    Your data is now safely stored in the cloud.
                  </AlertDescription>
                </Alert>
              )}

              {migrationStatus === 'failed' && (
                <Alert className="border-red-200 bg-red-50">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertTitle className="text-red-800">Migration Failed</AlertTitle>
                  <AlertDescription className="text-red-700">
                    {errors.length > 0 ? (
                      <ul className="list-disc list-inside mt-2">
                        {errors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    ) : (
                      'An unexpected error occurred during migration.'
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {migrationStatus === 'idle' && !isMigrated && localDataCount > 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Ready to Migrate</AlertTitle>
                  <AlertDescription>
                    You have {localDataCount} properties in local storage ready to migrate.
                    This process is safe and reversible.
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {!isMigrated && localDataCount > 0 && (
                  <Button 
                    onClick={startMigration}
                    disabled={migrationStatus === 'running'}
                    className="flex-1"
                  >
                    {migrationStatus === 'running' ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Migrating...
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4 mr-2" />
                        Start Migration
                      </>
                    )}
                  </Button>
                )}

                <Button 
                  variant="outline"
                  onClick={exportLocalData}
                  disabled={localDataCount === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Backup Data
                </Button>

                {isMigrated && (
                  <Button 
                    variant="outline"
                    onClick={checkStatus}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Status
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Flags Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Feature Flags
            </CardTitle>
            <CardDescription>
              Control how data is stored and accessed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(FeatureFlag).map(([key, flag]) => {
                const config = FeatureFlags.getConfig(flag)
                const isEnabled = featureFlags[flag]
                
                return (
                  <div key={flag} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{config.name}</p>
                        <Badge variant={isEnabled ? 'default' : 'secondary'}>
                          {isEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleFeatureFlag(flag)}
                    >
                      Toggle
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Actions that permanently affect your data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button
                variant="destructive"
                onClick={clearLocalStorage}
                disabled={localDataCount === 0}
              >
                Clear Local Storage
              </Button>
              <p className="text-sm text-gray-600">
                This will permanently delete all data from your browser's local storage.
                Make sure to backup your data first.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}