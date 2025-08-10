'use client'

import { DollarSign, TrendingUp, TrendingDown, Calendar, Users, Percent, AlertCircle } from 'lucide-react'

interface PricingInsightsProps {
  basePrice: number
  cleaningFee?: number
  serviceFee?: number
  weeklyDiscount?: number
  monthlyDiscount?: number
  guestCapacity: number
  bedrooms: number
}

export default function PricingInsights({
  basePrice,
  cleaningFee = 0,
  serviceFee = 0,
  weeklyDiscount = 0,
  monthlyDiscount = 0,
  guestCapacity,
  bedrooms
}: PricingInsightsProps) {
  // Calculate metrics
  const totalFirstNight = basePrice + cleaningFee + serviceFee
  const pricePerGuest = basePrice / guestCapacity
  const pricePerBedroom = basePrice / bedrooms
  
  // Market comparison (these would ideally come from competitor data)
  const avgMarketPrice = basePrice * 1.1 // Placeholder
  const isPricedCompetitively = basePrice <= avgMarketPrice
  
  // Calculate revenue projections
  const avgOccupancyRate = 0.65 // 65% occupancy
  const monthlyNights = 30 * avgOccupancyRate
  const monthlyRevenue = monthlyNights * basePrice
  const yearlyRevenue = monthlyRevenue * 12
  
  // Cleaning fee analysis
  const cleaningFeeRatio = cleaningFee / basePrice
  const isCleaningFeeHigh = cleaningFeeRatio > 0.5
  
  // Discount analysis
  const hasDiscounts = weeklyDiscount > 0 || monthlyDiscount > 0
  const recommendedWeeklyDiscount = 10
  const recommendedMonthlyDiscount = 20

  return (
    <div className="space-y-8">
      {/* Pricing Overview */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Base Price</h3>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold mb-2">${basePrice}</div>
          <div className="text-sm text-gray-600">per night</div>
          <div className="mt-4 flex items-center gap-2">
            {isPricedCompetitively ? (
              <>
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600">Competitive</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600">Above market</span>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Total First Night</h3>
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold mb-2">${totalFirstNight}</div>
          <div className="text-sm text-gray-600">including fees</div>
          <div className="mt-4 text-xs space-y-1">
            <div className="flex justify-between">
              <span>Base:</span>
              <span>${basePrice}</span>
            </div>
            {cleaningFee > 0 && (
              <div className="flex justify-between">
                <span>Cleaning:</span>
                <span>${cleaningFee}</span>
              </div>
            )}
            {serviceFee > 0 && (
              <div className="flex justify-between">
                <span>Service:</span>
                <span>${serviceFee}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Price per Guest</h3>
            <Users className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-3xl font-bold mb-2">${pricePerGuest.toFixed(0)}</div>
          <div className="text-sm text-gray-600">per person/night</div>
          <div className="mt-4 text-sm">
            {pricePerGuest < 50 ? (
              <span className="text-green-600">Great value for groups</span>
            ) : pricePerGuest < 75 ? (
              <span className="text-yellow-600">Fair group pricing</span>
            ) : (
              <span className="text-orange-600">Consider group discounts</span>
            )}
          </div>
        </div>
      </div>

      {/* Revenue Projections */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Revenue Projections</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-2">Monthly (at 65% occupancy)</p>
            <p className="text-2xl font-bold text-green-600">
              ${monthlyRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">~{monthlyNights.toFixed(0)} nights</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Yearly Potential</p>
            <p className="text-2xl font-bold text-green-600">
              ${yearlyRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">~{(monthlyNights * 12).toFixed(0)} nights</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Break-even Nights</p>
            <p className="text-2xl font-bold">
              {Math.ceil(2000 / basePrice)} nights
            </p>
            <p className="text-xs text-gray-500 mt-1">to cover $2k costs</p>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Tip:</strong> Increasing price by 10% could add ${(yearlyRevenue * 0.1).toLocaleString('en-US', { maximumFractionDigits: 0 })} yearly revenue if occupancy remains stable.
          </p>
        </div>
      </div>

      {/* Fees Analysis */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Fees Analysis</h3>
        <div className="space-y-4">
          {/* Cleaning Fee */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Cleaning Fee</span>
              <span className="text-lg font-bold">${cleaningFee}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${isCleaningFeeHigh ? 'bg-orange-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(cleaningFeeRatio * 100, 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {cleaningFeeRatio.toFixed(0)}% of base price
            </p>
            {isCleaningFeeHigh && (
              <div className="mt-2 p-2 bg-orange-50 rounded text-sm text-orange-900">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                High cleaning fee may deter short stays
              </div>
            )}
          </div>

          {/* Service Fee Info */}
          {serviceFee > 0 && (
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Service Fee</span>
                <span className="text-lg font-bold">${serviceFee}</span>
              </div>
              <p className="text-sm text-gray-600">
                Platform service fee passed to guests
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Discounts */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Discount Strategy</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Weekly Discount</span>
              <Percent className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold mb-2">
              {weeklyDiscount > 0 ? `${weeklyDiscount}%` : 'Not set'}
            </div>
            {weeklyDiscount === 0 && (
              <p className="text-sm text-orange-600">
                Recommended: {recommendedWeeklyDiscount}% to attract longer stays
              </p>
            )}
            {weeklyDiscount > 0 && weeklyDiscount < recommendedWeeklyDiscount && (
              <p className="text-sm text-yellow-600">
                Consider increasing to {recommendedWeeklyDiscount}%
              </p>
            )}
            {weeklyDiscount >= recommendedWeeklyDiscount && (
              <p className="text-sm text-green-600">
                Good incentive for week-long stays
              </p>
            )}
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Monthly Discount</span>
              <Percent className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold mb-2">
              {monthlyDiscount > 0 ? `${monthlyDiscount}%` : 'Not set'}
            </div>
            {monthlyDiscount === 0 && (
              <p className="text-sm text-orange-600">
                Recommended: {recommendedMonthlyDiscount}% for stable income
              </p>
            )}
            {monthlyDiscount > 0 && monthlyDiscount < recommendedMonthlyDiscount && (
              <p className="text-sm text-yellow-600">
                Consider increasing to {recommendedMonthlyDiscount}%
              </p>
            )}
            {monthlyDiscount >= recommendedMonthlyDiscount && (
              <p className="text-sm text-green-600">
                Attractive for digital nomads
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Pricing Recommendations */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">💰 Pricing Optimization Tips</h3>
        <div className="space-y-3">
          {!hasDiscounts && (
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">1</div>
              <div>
                <h4 className="font-medium mb-1">Add Length-of-Stay Discounts</h4>
                <p className="text-sm text-gray-700">
                  Offer {recommendedWeeklyDiscount}% weekly and {recommendedMonthlyDiscount}% monthly discounts to increase average booking length and reduce turnover costs.
                </p>
              </div>
            </div>
          )}
          
          {isCleaningFeeHigh && (
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">2</div>
              <div>
                <h4 className="font-medium mb-1">Optimize Cleaning Fee</h4>
                <p className="text-sm text-gray-700">
                  Your cleaning fee is {(cleaningFeeRatio * 100).toFixed(0)}% of base price. Consider reducing to 30-40% to attract short stays.
                </p>
              </div>
            </div>
          )}
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">3</div>
            <div>
              <h4 className="font-medium mb-1">Implement Dynamic Pricing</h4>
              <p className="text-sm text-gray-700">
                Use seasonal adjustments: +20% for peak season, -15% for off-season to maximize revenue.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">4</div>
            <div>
              <h4 className="font-medium mb-1">Test Price Increases</h4>
              <p className="text-sm text-gray-700">
                If your occupancy is above 75%, try increasing prices by 5-10% to find your optimal rate.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}