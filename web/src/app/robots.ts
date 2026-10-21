import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/superadmin', '/dashboard', '/login', '/forgot-password', '/reset-password', '/voucher/reserve', '/uploads/documents', '/uploads/payments'] }],
    sitemap: `${SITE.url}/sitemap.xml`,
  }
}
