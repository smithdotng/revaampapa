import { Models, db } from '@/lib/legacy'

export const revalidate = 300

export async function GET() {
  try {
    await db()
    const properties = await Models.Property.find({ verificationStatus: 'verified', status: 'available' })
      .select('title slug price location images propertyType transactionType').sort('-createdAt').limit(12).lean()
    return Response.json({ success: true, properties })
  } catch (err) {
    console.error('[api/properties/recent]', err)
    return Response.json({ success: false, properties: [] })
  }
}
