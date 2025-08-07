'use client'

import { useState } from 'react'
import { X, Download, FileText, Table, ExternalLink } from 'lucide-react'

interface InstructionsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function InstructionsModal({ isOpen, onClose }: InstructionsModalProps) {
  const [activeTab, setActiveTab] = useState<'pdf' | 'csv' | 'occupancy'>('pdf')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            How to Download Your Airbnb Reports
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b px-6">
          <div className="flex space-x-6">
            <button
              onClick={() => setActiveTab('pdf')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'pdf'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Earnings PDF
            </button>
            <button
              onClick={() => setActiveTab('csv')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'csv'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Table className="w-4 h-4 inline mr-2" />
              Transactions
            </button>
            <button
              onClick={() => setActiveTab('occupancy')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'occupancy'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Download className="w-4 h-4 inline mr-2" />
              Occupancy & Rates
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
          {activeTab === 'pdf' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 font-medium mb-1">
                  📄 Monthly Earnings Report (PDF)
                </p>
                <p className="text-sm text-blue-700">
                  Contains your property revenues, service fees, and occupancy data
                </p>
              </div>

              <ol className="space-y-4">
                <li className="flex">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    1
                  </span>
                  <div className="ml-4 flex-1">
                    <p className="font-medium text-gray-900">Go to Airbnb Earnings</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Visit{' '}
                      <a
                        href="https://www.airbnb.com/earnings"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        airbnb.com/earnings
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </div>
                </li>

                <li className="flex">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    2
                  </span>
                  <div className="ml-4 flex-1">
                    <p className="font-medium text-gray-900">Select Date Range</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Choose the month you want to analyze (e.g., "Last month" or "Custom dates")
                    </p>
                  </div>
                </li>

                <li className="flex">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    3
                  </span>
                  <div className="ml-4 flex-1">
                    <p className="font-medium text-gray-900">Click "Download PDF"</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Look for the download button at the top right of the earnings page
                    </p>
                    <div className="mt-2 p-3 bg-gray-100 rounded-lg">
                      <code className="text-xs text-gray-700">
                        File format: MM_DD_YYYY-MM_DD_YYYY_airbnb_earnings.pdf
                      </code>
                    </div>
                  </div>
                </li>
              </ol>
            </div>
          )}
          {activeTab === 'csv' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-900 font-medium mb-1">
                  📊 Transaction History (CSV) - Optional
                </p>
                <p className="text-sm text-green-700">
                  Detailed booking data including guest names, dates, and payouts
                </p>
              </div>

              <ol className="space-y-4">
                <li className="flex">
                  <span className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    1
                  </span>
                  <div className="ml-4 flex-1">
                    <p className="font-medium text-gray-900">Go to Transaction History</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Visit{' '}
                      <a
                        href="https://www.airbnb.com/users/transaction_history"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        airbnb.com/users/transaction_history
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </div>
                </li>

                <li className="flex">
                  <span className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    2
                  </span>
                  <div className="ml-4 flex-1">
                    <p className="font-medium text-gray-900">Filter by Date</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Select the same month as your PDF report for consistency
                    </p>
                  </div>
                </li>

                <li className="flex">
                  <span className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    3
                  </span>
                  <div className="ml-4 flex-1">
                    <p className="font-medium text-gray-900">Export to CSV</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Click "Export" button and select "CSV" format
                    </p>
                    <div className="mt-2 p-3 bg-gray-100 rounded-lg">
                      <code className="text-xs text-gray-700">
                        File contains: Date, Type, Confirmation Code, Listing, Guest, Amount, etc.
                      </code>
                    </div>
                  </div>
                </li>
              </ol>
            </div>
          )}
          {activeTab === 'occupancy' && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-900 font-medium mb-1">
                  📈 Occupancy & Rates Report (CSV)
                </p>
                <p className="text-sm text-purple-700">
                  Detailed occupancy rates, pricing data, and booking patterns for each property
                </p>
              </div>

              <ol className="space-y-4">
                <li className="flex">
                  <span className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    1
                  </span>
                  <div className="ml-4 flex-1">
                    <p className="font-medium text-gray-900">Go to Performance Tab</p>
                    <p className="text-sm text-gray-600 mt-1">
                      From your Airbnb dashboard, navigate to{' '}
                      <a
                        href="https://www.airbnb.com/performance"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        Performance
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {' '}then click "Occupancy and rates"
                    </p>
                  </div>
                </li>

                <li className="flex">
                  <span className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    2
                  </span>
                  <div className="ml-4 flex-1">
                    <p className="font-medium text-gray-900">Select Your Properties</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Choose "All listings" or select specific properties to analyze
                    </p>
                  </div>
                </li>

                <li className="flex">
                  <span className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    3
                  </span>
                  <div className="ml-4 flex-1">
                    <p className="font-medium text-gray-900">Set Date Range</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Select the same period as your earnings report (e.g., "Last 30 days" or custom dates)
                    </p>
                  </div>
                </li>

                <li className="flex">
                  <span className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    4
                  </span>
                  <div className="ml-4 flex-1">
                    <p className="font-medium text-gray-900">Download CSV</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Click the "Export" or "Download" button and select CSV format
                    </p>
                    <div className="mt-2 p-3 bg-gray-100 rounded-lg">
                      <code className="text-xs text-gray-700">
                        File contains: Occupancy rate, ADR (Average Daily Rate), Revenue per available night, Booked nights, Available nights
                      </code>
                    </div>
                  </div>
                </li>
              </ol>

              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800">
                  <strong>Pro tip:</strong> This report provides the most detailed performance metrics and helps identify pricing optimization opportunities.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Start with the Earnings PDF. Add CSVs for deeper insights.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}