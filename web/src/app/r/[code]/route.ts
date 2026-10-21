import { db, Models } from '@/lib/legacy'
import { updateSession } from '@/lib/session'
import { visitor, go } from '@/lib/track'

// Promoter property links: record the click, remember who referred this visitor, show the property
export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  try {
    await db()
    const promo = await Models.Promotion.findOne({ referralCode: code }).populate('property', 'slug')
    if (!promo?.property) return go('/properties')
    const who = await visitor()
    await Promise.all([
      new Models.Click({ promotion: promo._id, promoter: promo.promoter, property: promo.property._id, ...who }).save(),
      new Models.ClickTracking({ promoter: promo.promoter, property: promo.property._id, type: 'property', referralLink: code, ...who }).save(),
      Models.Promotion.updateOne({ _id: promo._id }, { $inc: { clicks: 1 }, $set: { lastClickedAt: new Date() } }),
      Models.User.updateOne({ _id: promo.promoter }, { $inc: { 'referralStats.totalClicks': 1 } }),
    ])
    await updateSession({
      referringPromoter: { id: String(promo.promoter), promotionId: String(promo._id), propertyId: String(promo.property._id), referralCode: code },
    })
    return go(`/properties/${promo.property.slug}`)
  } catch (err) {
    console.error('[r]', err)
    return go('/properties')
  }
}
