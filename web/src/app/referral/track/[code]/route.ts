import { db, Models } from '@/lib/legacy'
import { visitor, go } from '@/lib/track'

// Promoter-recruits-promoter links (PROMO-<userId>)
export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  try {
    await db()
    const id = code.startsWith('PROMO-') ? code.slice(6) : ''
    const user = /^[0-9a-f]{24}$/i.test(id)
      ? await Models.User.findById(id).select('_id')
      : await Models.User.findOne({ 'promoterProfile.referralCode': code }).select('_id')
    if (user) {
      const who = await visitor()
      await new Models.ReferralClick({ referrer: user._id, referralCode: code, referralType: 'promoter', ipAddress: who.ipAddress, userAgent: who.userAgent, referrerUrl: who.referrer || 'direct' }).save()
      await Models.User.updateOne({ _id: user._id }, { $inc: { 'referralStats.totalClicks': 1 } })
    }
  } catch (err) {
    console.error('[referral track]', err)
  }
  return go(`/promoter/register?ref=${encodeURIComponent(code)}`)
}
