import { ArrowRight, BarChart3, Bell, Users, TrendingUp, Calendar, Shield } from 'lucide-react'

export default function UpgradePrompt() {
  const analyticsUrl = process.env.NEXT_PUBLIC_ANALYTICS_URL || 'http://localhost:9003'

  return (
    <div className="mt-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-4">
          Want to Track Your Progress?
        </h2>
        <p className="text-xl text-blue-100 mb-8">
          Join thousands of hosts using our advanced analytics platform to maximize revenue
        </p>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <BarChart3 className="w-8 h-8 mb-3" />
            <h3 className="font-semibold mb-1">Revenue Tracking</h3>
            <p className="text-sm text-blue-100">
              Upload your earnings data for detailed financial insights
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <Calendar className="w-8 h-8 mb-3" />
            <h3 className="font-semibold mb-1">Monthly Monitoring</h3>
            <p className="text-sm text-blue-100">
              Track improvements and get alerts on changes
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <Users className="w-8 h-8 mb-3" />
            <h3 className="font-semibold mb-1">Portfolio Management</h3>
            <p className="text-sm text-blue-100">
              Analyze and optimize multiple properties at once
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <a
            href={analyticsUrl}
            className="inline-flex items-center px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5 ml-2" />
          </a>
          
          <button className="inline-flex items-center px-6 py-3 bg-white/20 backdrop-blur text-white rounded-lg font-semibold hover:bg-white/30 transition-colors">
            Learn More
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-white/20">
          <h3 className="text-lg font-semibold mb-4">Premium Features Include:</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-sm">Competitor comparison</span>
            </div>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-green-400" />
              <span className="text-sm">Price drop alerts</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-sm">Market trend analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-green-400" />
              <span className="text-sm">Seasonal insights</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}