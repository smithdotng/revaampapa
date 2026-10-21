import { db, Models } from '@/lib/legacy'
import { visitor, go } from '@/lib/track'

// Promoter / partner hotel links: attribute the click, then show the hotel
export async function GET(_req: Request, ctx: { params: Promise<{ hotelId: string; code: string }> }) {
  const { hotelId, code } = await ctx.params
  try {
    await db()
    const hotel = /^[0-9a-f]{24}$/i.test(hotelId) ? await Models.Hotel.findById(hotelId).select('slug') : null
    if (!hotel) return go('/hotels')
    const promoter = await Models.User.findOne({ 'promoterProfile.uniqueLinks.code': code }).select('_id userType')
    const partner = promoter?.userType === 'business_partner' ? promoter : promoter ? null : await Models.User.findOne({ 'businessPartnerProfile.uniqueLinks.code': code }).select('_id')
    const who = await visitor()
    await new Models.HotelClick({
      hotel: hotel._id,
      promoter: promoter && promoter.userType !== 'business_partner' ? promoter._id : undefined,
      businessPartner: partner?._id,
      clickerType: partner ? 'business_partner' : promoter ? 'promoter' : 'anonymous',
      uniqueLinkCode: code,
      ...who,
    }).save()
    return go(`/hotels/${hotel.slug}?ref=${encodeURIComponent(code)}`)
  } catch (err) {
    console.error('[hotel track]', err)
    return go('/hotels')
  }
}
