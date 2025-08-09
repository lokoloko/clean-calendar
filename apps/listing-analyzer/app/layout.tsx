import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Free Airbnb Listing Analyzer | Boost Your Bookings',
  description: 'Get instant AI-powered recommendations to improve your Airbnb listing and increase bookings. 100% free, no signup required.',
  keywords: 'airbnb analyzer, listing optimization, increase bookings, airbnb tips, property analysis',
  openGraph: {
    title: 'Free Airbnb Listing Analyzer',
    description: 'Get instant recommendations to boost your Airbnb bookings',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}