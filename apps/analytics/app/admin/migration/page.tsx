'use client'

export default function MigrationPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Data Migration Center</h1>
          <p className="text-gray-600">Migration feature temporarily disabled during build process</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">Migration Status</h2>
          <p className="text-gray-600 mb-4">
            Database migration functionality is being updated
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3a1 1 0 001 1h2a1 1 0 100-2h-1V7z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-medium text-blue-900">Feature Under Maintenance</h3>
                <p className="text-blue-800 text-sm mt-1">
                  The data migration feature is temporarily disabled while we update the build configuration.
                  Please check back later.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}