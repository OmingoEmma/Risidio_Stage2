import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI + Web3 Escrow Demo',
  description: 'Booking assistant with Polygon Amoy escrow',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-chatBg min-h-screen">{children}</body>
    </html>
  )
}
