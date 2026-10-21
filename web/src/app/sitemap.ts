import type { MetadataRoute } from 'next'
import { sitemapEntries } from '@/lib/data'
import { SITE } from '@/lib/site'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const u = (p: string) => `${SITE.url}${p}`
  const { properties, hotels, blogs } = await sitemapEntries()
  const fixed = ['/', '/properties', '/hotels', '/projects', '/how-it-works', '/blog', '/about', '/contact', '/join',
    '/promoter/register', '/register', '/business-partner/register', '/voucher/register', '/partner-hotel/register',
    '/project-subscriber/register', '/solicitor/register', '/solicitor/hectare/register', '/architect/register', '/terms', '/privacy', '/cookies']
  return [
    ...fixed.map((p) => ({ url: u(p) })),
    ...properties.map((p) => ({ url: u(`/properties/${p.slug}`), lastModified: p.updatedAt })),
    ...hotels.map((h) => ({ url: u(`/hotels/${h.slug}`) })),
    ...blogs.map((b) => ({ url: u(`/blog/${b.slug}`), lastModified: b.updatedAt })),
  ]
}
