import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import './globals.css'
import { NoticeToast } from '@/components/NoticeToast'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Real estate development across Africa`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    locale: 'en_NG',
    images: [{ url: '/brand/og-image.jpg', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' },
}

export const viewport: Viewport = {
  themeColor: '#f6f8f7',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG">
      <body className="flex min-h-dvh flex-col">
        {children}
        <Suspense>
          <NoticeToast />
        </Suspense>
      </body>
    </html>
  )
}
