import 'server-only'
import { cache } from 'react'
import { db, Models } from './legacy'

/* eslint-disable @typescript-eslint/no-explicit-any */

export type Img = { url: string; isPrimary?: boolean }

export type PropertySummary = {
  id: string
  title: string
  slug: string
  price: number
  priceNegotiable?: boolean
  propertyType: string
  transactionType: string
  location: { address?: string; city?: string; state?: string; lga?: string; landmark?: string }
  image: string | null
  features?: Record<string, number | boolean | undefined>
  featured?: boolean
  createdAt?: string
}

export type PropertyDetail = PropertySummary & {
  description: string
  images: Img[]
  videoUrl?: string
  views: number
  agencyFee?: number
  shortletDetails?: Record<string, any>
}

export type HotelSummary = {
  id: string
  name: string
  slug: string
  description: string
  location: { address?: string; city?: string; state?: string; country?: string }
  image: string | null
  amenities: string[]
  rating: number
  featured: boolean
  voucherDiscountRate: number
}

export type HotelDetail = HotelSummary & {
  images: Img[]
  contactInfo: { phone?: string; email?: string; website?: string }
}

export type BlogSummary = {
  id: string
  title: string
  slug: string
  excerpt: string
  featuredImage: string
  authorName: string
  categories: string[]
  publishedAt?: string
  readingTime: number
}

export type BlogDetail = BlogSummary & {
  content: string
  tags: string[]
  metaTitle?: string
  metaDescription?: string
  ogImage?: string
}

const LIVE = { verificationStatus: 'verified', status: 'available' }

function primaryImage(images?: Img[]): string | null {
  if (!images?.length) return null
  return (images.find((i) => i.isPrimary) || images[0]).url || null
}

const imgs = (list?: Img[]) => (list || []).filter((i) => i?.url).map((i) => ({ url: i.url, isPrimary: !!i.isPrimary }))
const plain = <T,>(v: T): T => (v == null ? v : JSON.parse(JSON.stringify(v)))

function iso(d: any) {
  return d ? new Date(d).toISOString() : undefined
}

function toPropertySummary(p: any): PropertySummary {
  return {
    id: String(p._id),
    title: p.title,
    slug: p.slug,
    price: p.price,
    priceNegotiable: !!p.priceNegotiable,
    propertyType: p.propertyType,
    transactionType: p.transactionType,
    location: plain(p.location) || {},
    image: primaryImage(p.images),
    features: plain(p.features) || {},
    featured: !!p.featured,
    createdAt: iso(p.createdAt),
  }
}

function toHotelSummary(h: any): HotelSummary {
  return {
    id: String(h._id),
    name: h.name,
    slug: h.slug,
    description: h.description || '',
    location: plain(h.location) || {},
    image: primaryImage(h.images),
    amenities: h.amenities || [],
    rating: h.rating || 0,
    featured: !!h.featured,
    voucherDiscountRate: h.voucherDiscountRate || 0,
  }
}

function toBlogSummary(b: any): BlogSummary {
  return {
    id: String(b._id),
    title: b.title,
    slug: b.slug,
    excerpt: b.excerpt || '',
    featuredImage: b.featuredImage,
    authorName: b.authorName || 'Revaamp',
    categories: b.categories || [],
    publishedAt: iso(b.publishedAt || b.createdAt),
    readingTime: b.readingTime || 1,
  }
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Run a query but degrade to a fallback (and log) if the database is unreachable. */
async function safe<T>(label: string, fallback: T, fn: () => Promise<NoInfer<T>>): Promise<T> {
  try {
    await db()
    return await fn()
  } catch (err) {
    console.error(`[data] ${label}:`, (err as Error).message)
    return fallback
  }
}

const CARD_FIELDS = 'title slug price priceNegotiable location images propertyType transactionType features featured createdAt'

export const getHomeData = cache(async () =>
  safe('home', { latest: [] as PropertySummary[], stats: { properties: 0, promoters: 0, hotels: 0 } }, async () => {
    const { Property, User, Hotel } = Models
    const [featured, recent, properties, promoters, hotels] = await Promise.all([
      Property.find({ ...LIVE, featured: true }).select(CARD_FIELDS).sort('-createdAt').limit(6).lean(),
      Property.find(LIVE).select(CARD_FIELDS).sort('-createdAt').limit(9).lean(),
      Property.countDocuments(LIVE),
      User.countDocuments({ userType: 'promoter', 'promoterProfile.isApproved': true }),
      Hotel.countDocuments({ isActive: true }),
    ])
    // Featured first, then the newest, without duplicates
    const seen = new Set<string>()
    const latest = [...featured, ...recent]
      .filter((p: any) => (seen.has(String(p._id)) ? false : (seen.add(String(p._id)), true)))
      .slice(0, 6)
      .map(toPropertySummary)
    return { latest, stats: { properties, promoters, hotels } }
  }),
)

export type PropertyFilters = {
  q?: string
  type?: string
  deal?: string
  state?: string
  sort?: string
  page?: number
}

export const PAGE_SIZE = 12

export async function searchProperties(f: PropertyFilters) {
  return safe('properties', { items: [] as PropertySummary[], total: 0, pages: 0, page: 1 }, async () => {
    const { Property } = Models
    const query: Record<string, any> = { ...LIVE }
    if (f.type) query.propertyType = f.type
    if (f.deal) query.transactionType = f.deal
    if (f.state) query['location.state'] = new RegExp(`^${escapeRegex(f.state)}$`, 'i')
    if (f.q) {
      const rx = new RegExp(escapeRegex(f.q), 'i')
      query.$or = [{ title: rx }, { 'location.city': rx }, { 'location.state': rx }, { 'location.address': rx }, { description: rx }]
    }
    const sort =
      f.sort === 'price-asc' ? { price: 1 } : f.sort === 'price-desc' ? { price: -1 } : { featured: -1, createdAt: -1 }
    const page = Math.max(1, f.page || 1)
    const [items, total] = await Promise.all([
      Property.find(query).select(CARD_FIELDS).sort(sort).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
      Property.countDocuments(query),
    ])
    return { items: items.map(toPropertySummary), total, pages: Math.ceil(total / PAGE_SIZE), page }
  })
}

export const getPropertyStates = cache(async () =>
  safe('states', [] as string[], async () => {
    const states: string[] = await Models.Property.distinct('location.state', LIVE)
    return states.filter(Boolean).sort((a, b) => a.localeCompare(b))
  }),
)

export const getProperty = cache(async (slug: string) =>
  safe('property', null as (PropertyDetail & { ownerId: string }) | null, async () => {
    const p: any = await Models.Property.findOne({ slug, verificationStatus: 'verified' }).lean()
    if (!p) return null
    return {
      ...toPropertySummary(p),
      description: p.description || '',
      images: imgs(p.images),
      videoUrl: p.videoUrl,
      views: p.views || 0,
      agencyFee: p.agencyFee,
      shortletDetails: p.propertyType === 'shortlet' ? plain(p.shortletDetails) : undefined,
      ownerId: String(p.owner),
    }
  }),
)

/** Count a view the same way the Express app did. Fire-and-forget. */
export async function countPropertyView(id: string) {
  try {
    await db()
    await Models.Property.updateOne({ _id: id }, { $inc: { views: 1 } })
  } catch {}
}

export async function getSimilarProperties(p: PropertySummary) {
  return safe('similar', [] as PropertySummary[], async () => {
    const items = await Models.Property.find({
      ...LIVE,
      _id: { $ne: p.id },
      $or: [{ propertyType: p.propertyType }, { 'location.state': p.location.state }],
    })
      .select(CARD_FIELDS)
      .sort('-createdAt')
      .limit(3)
      .lean()
    return items.map(toPropertySummary)
  })
}

export async function searchHotels(f: { q?: string; state?: string; page?: number }) {
  return safe('hotels', { items: [] as HotelSummary[], total: 0, pages: 0, page: 1 }, async () => {
    const query: Record<string, any> = { isActive: true }
    if (f.state) query['location.state'] = new RegExp(escapeRegex(f.state), 'i')
    if (f.q) {
      const rx = new RegExp(escapeRegex(f.q), 'i')
      query.$or = [{ name: rx }, { 'location.city': rx }, { 'location.state': rx }]
    }
    const page = Math.max(1, f.page || 1)
    const [items, total] = await Promise.all([
      Models.Hotel.find(query).sort({ featured: -1, createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
      Models.Hotel.countDocuments(query),
    ])
    return { items: items.map(toHotelSummary), total, pages: Math.ceil(total / PAGE_SIZE), page }
  })
}

export const getHotel = cache(async (slug: string) =>
  safe('hotel', null as HotelDetail | null, async () => {
    const h: any = await Models.Hotel.findOne({ slug, isActive: true }).lean()
    if (!h) return null
    return { ...toHotelSummary(h), images: imgs(h.images), contactInfo: plain(h.contactInfo) || {} }
  }),
)

export async function getFeaturedHotels(limit = 3) {
  return safe('featured hotels', [] as HotelSummary[], async () => {
    const items = await Models.Hotel.find({ isActive: true }).sort({ featured: -1, createdAt: -1 }).limit(limit).lean()
    return items.map(toHotelSummary)
  })
}

export async function listBlogs(f: { category?: string; q?: string; page?: number }) {
  return safe(
    'blogs',
    { items: [] as BlogSummary[], total: 0, pages: 0, page: 1, categories: [] as { name: string; count: number }[] },
    async () => {
      const query: Record<string, any> = { status: 'published' }
      if (f.category) query.categories = f.category
      if (f.q) {
        const rx = new RegExp(escapeRegex(f.q), 'i')
        query.$or = [{ title: rx }, { excerpt: rx }]
      }
      const size = 9
      const page = Math.max(1, f.page || 1)
      const [items, total, cats] = await Promise.all([
        Models.Blog.find(query).select('-content').sort('-publishedAt').skip((page - 1) * size).limit(size).lean(),
        Models.Blog.countDocuments(query),
        Models.Blog.aggregate([
          { $match: { status: 'published' } },
          { $unwind: '$categories' },
          { $group: { _id: '$categories', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
      ])
      return {
        items: items.map(toBlogSummary),
        total,
        pages: Math.ceil(total / size),
        page,
        categories: cats.map((c: any) => ({ name: c._id as string, count: c.count as number })),
      }
    },
  )
}

export const getBlog = cache(async (slug: string) =>
  safe('blog', null as BlogDetail | null, async () => {
    const b: any = await Models.Blog.findOne({ slug, status: 'published' }).lean()
    if (!b) return null
    return {
      ...toBlogSummary(b),
      content: b.content || '',
      tags: b.tags || [],
      metaTitle: b.metaTitle,
      metaDescription: b.metaDescription,
      ogImage: b.ogImage,
    }
  }),
)

export async function countBlogView(id: string) {
  try {
    await db()
    await Models.Blog.updateOne({ _id: id }, { $inc: { views: 1 } })
  } catch {}
}

export async function getRelatedBlogs(b: BlogSummary) {
  return safe('related blogs', [] as BlogSummary[], async () => {
    const items = await Models.Blog.find({ status: 'published', _id: { $ne: b.id }, categories: { $in: b.categories } })
      .select('-content')
      .sort('-publishedAt')
      .limit(3)
      .lean()
    return items.map(toBlogSummary)
  })
}

export async function sitemapEntries() {
  return safe('sitemap', { properties: [] as { slug: string; updatedAt?: string }[], hotels: [] as { slug: string }[], blogs: [] as { slug: string; updatedAt?: string }[] }, async () => {
    const [properties, hotels, blogs] = await Promise.all([
      Models.Property.find(LIVE).select('slug updatedAt').lean(),
      Models.Hotel.find({ isActive: true }).select('slug').lean(),
      Models.Blog.find({ status: 'published' }).select('slug updatedAt').lean(),
    ])
    return {
      properties: properties.map((p: any) => ({ slug: p.slug, updatedAt: iso(p.updatedAt) })),
      hotels: hotels.filter((h: any) => h.slug).map((h: any) => ({ slug: h.slug })),
      blogs: blogs.map((b: any) => ({ slug: b.slug, updatedAt: iso(b.updatedAt) })),
    }
  })
}

/** Older promoter links point at /properties/<slug>?ref=<code>; count those clicks too. */
export async function recordPromotionClick(code: string, propertyId: string) {
  try {
    await db()
    const promo = await Models.Promotion.findOne({ referralCode: code, property: propertyId }).select('_id promoter')
    if (!promo) return
    await Promise.all([
      new Models.ClickTracking({ promoter: promo.promoter, property: propertyId, type: 'property', referralLink: code }).save(),
      Models.Promotion.updateOne({ _id: promo._id }, { $inc: { clicks: 1 }, $set: { lastClickedAt: new Date() } }),
      Models.User.updateOne({ _id: promo.promoter }, { $inc: { 'referralStats.totalClicks': 1 } }),
    ])
  } catch {}
}
