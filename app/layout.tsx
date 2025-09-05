
import './globals.css'
import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: "Pastor's Sermon Studio",
  description: 'Draft sermons, plan series, curate worship, and stay on schedule.',
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
