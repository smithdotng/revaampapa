import { db, Models } from '@/lib/legacy'
import { setNotice } from '@/lib/notice'
import { go } from '@/lib/track'

/* eslint-disable @typescript-eslint/no-explicit-any */
// Paystack sends the subscriber back here after checkout
export async function GET(req: Request) {
  const reference = new URL(req.url).searchParams.get('reference')
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!reference || !key) return go('/project-subscriber/subscription')
  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${key}` } })
    const data: any = await res.json()
    if (data?.data?.status !== 'success') {
      await setNotice('error', 'The payment wasn’t completed. You haven’t been charged — try again when you’re ready.')
      return go('/project-subscriber/subscription')
    }
    const { userId, plan } = data.data.metadata || {}
    const expiry = new Date()
    expiry.setFullYear(expiry.getFullYear() + 1)
    await db()
    await Models.User.updateOne({ _id: userId }, {
      $set: {
        'projectSubscriberProfile.subscriptionPlan': plan,
        'projectSubscriberProfile.subscriptionStatus': 'active',
        'projectSubscriberProfile.subscriptionDate': new Date(),
        'projectSubscriberProfile.subscriptionExpiry': expiry,
        'projectSubscriberProfile.isApproved': true,
        'projectSubscriberProfile.approvalDate': new Date(),
      },
      $push: { 'projectSubscriberProfile.paymentHistory': { amount: data.data.amount / 100, date: new Date(), reference, description: `${plan} subscription` } },
    })
    await setNotice('success', 'Subscription active. You can now submit your bank guarantee and start a project.')
    return go('/project-subscriber/dashboard')
  } catch (err) {
    console.error('[paystack verify]', err)
    await setNotice('error', 'We couldn’t confirm the payment. If you were charged, email info@revaampapa.com with the reference.')
    return go('/project-subscriber/subscription')
  }
}
