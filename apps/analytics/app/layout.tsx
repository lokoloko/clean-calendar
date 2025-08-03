import './globals.css'

export const metadata = {
  title: 'GoStudioM Analytics',
  description: 'Airbnb analytics dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}