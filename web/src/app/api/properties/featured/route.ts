import { Models, db } from '@/lib/legacy'

export const revalidate = 300
const FIELDS = 'title slug price location images propertyType transactionType featured'

export async function GET() {
  try {
    await db()
    const live = { verificationStatus: 'verified', status: 'available' }
    let properties = await Models.Property.find({ ...live, featured: true }).select(FIELDS).sort('-createdAt').limit(6).lean()
    if (!properties.length) properties = await Models.Property.find(live).select(FIELDS).sort('-createdAt').limit(6).lean()
    return Response.json({ success: true, properties })
  } catch (err) {
    console.error('[api/properties/featured]', err)
    return Response.json({ success: false, properties: [] })
  }
}
