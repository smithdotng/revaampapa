import { Models, db } from '@/lib/legacy'

export const revalidate = 600

export async function GET() {
  try {
    await db()
    const [propertyCount, promoterCount, transactionCount] = await Promise.all([
      Models.Property.countDocuments({ verificationStatus: 'verified', status: 'available' }),
      Models.User.countDocuments({ userType: 'promoter', 'promoterProfile.isApproved': true }),
      Models.Transaction.countDocuments({ paymentStatus: 'completed' }),
    ])
    return Response.json({ success: true, propertyCount, promoterCount, transactionCount })
  } catch (err) {
    console.error('[api/stats]', err)
    return Response.json({ success: false, propertyCount: 0, promoterCount: 0, transactionCount: 0 })
  }
}
