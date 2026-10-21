export function naira(n?: number | null, opts: { compact?: boolean } = {}) {
  if (n === undefined || n === null || Number.isNaN(n)) return '—'
  if (opts.compact && n >= 1_000_000) {
    const v = n / 1_000_000
    return `₦${v >= 100 ? v.toFixed(0) : v.toFixed(v % 1 === 0 ? 0 : 1)}m`
  }
  return '₦' + Math.round(n).toLocaleString('en-NG')
}

export const PROPERTY_TYPES: Record<string, string> = {
  building: 'Building',
  land: 'Land',
  shortlet: 'Shortlet',
  shop: 'Shop',
  business_complex: 'Business complex',
}

export const TRANSACTION_TYPES: Record<string, string> = {
  sale: 'For sale',
  rent: 'For rent',
  lease: 'For lease',
}

export const AMENITIES: Record<string, string> = {
  wifi: 'Wi‑Fi',
  pool: 'Pool',
  gym: 'Gym',
  restaurant: 'Restaurant',
  parking: 'Parking',
  spa: 'Spa',
  conference: 'Conference rooms',
  airport_shuttle: 'Airport shuttle',
  room_service: 'Room service',
  bar: 'Bar',
}

export const NIGERIAN_STATES = [
  'Abia', 'Abuja (FCT)', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo', 'Jigawa', 'Kaduna',
  'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
  'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
]

export function formatDate(d?: string | Date | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function stripHtml(html = '') {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
}

export function place(loc?: { city?: string; state?: string; lga?: string }) {
  return [loc?.city, loc?.state].filter(Boolean).join(', ')
}

/**
 * Public URL for an image or document stored on a record.
 * Older records hold /uploads/... paths; once those files have been copied
 * elsewhere (scripts/migrate-uploads.mjs) NEXT_PUBLIC_UPLOADS_URL points at them.
 */
export function mediaUrl(src?: string | null) {
  if (!src) return ''
  const base = process.env.NEXT_PUBLIC_UPLOADS_URL
  if (base && src.startsWith('/uploads/')) return base.replace(/\/$/, '') + src
  return src
}
