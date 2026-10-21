import { NextResponse } from 'next/server'
import { Models, db, mongoose } from '@/lib/legacy'
import { setNotice } from '@/lib/notice'

/**
 * Paystack return URL for verification-fee payments started on the old site.
 * New listings pay by bank transfer, but a payment already in flight still lands here.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const reference = url.searchParams.get('reference') || url.searchParams.get('trxref')
  const back = NextResponse.redirect(new URL('/property-owner/dashboard', url))
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!reference || !key) {
    await setNotice('error', 'We couldn’t confirm that payment. If you were charged, email info@revaampapa.com with your reference.')
    return back
  }
  try {
    const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store' })
    const j = await r.json()
    const propertyId = j?.data?.metadata?.propertyId
    if (j?.data?.status === 'success' && mongoose.isValidObjectId(propertyId)) {
      await db()
      await Models.Property.findByIdAndUpdate(propertyId, {
        verificationStatus: 'payment_confirmed',
        status: 'payment_confirmed',
        verificationPaymentReference: reference,
        verificationPaymentDate: new Date(),
        verificationPaymentConfirmed: true,
        verificationPaymentConfirmedAt: new Date(),
      })
      await setNotice('success', 'Payment received. Your property is now waiting for verification.')
      return back
    }
  } catch (err) {
    console.error('[verification-callback]', err)
  }
  await setNotice('error', 'That payment couldn’t be verified. If you were charged, email info@revaampapa.com with your reference.')
  return back
}
