import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Models, mongoose } from '@/lib/legacy'
import { plain } from '@/lib/guard'
import { naira, formatDate } from '@/lib/format'
import { DashHeader, Panel, Stat, StatGrid, StatusPill, Table, KeyValue, EmptyState } from '@/components/dash/ui'
import { Act } from '@/components/admin/Act'
import { DocLink, Actions } from '@/components/admin/ui'
import {
  approvePromoter, rejectPromoter, toggleUserSuspended, confirmPartnerPayment, rejectPartnerPayment,
} from '@/actions/admin'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Account page for a promoter or business partner: wallet, activity and admin controls. */
export async function EarnerDetail({ id, type }: { id: string; type: 'promoter' | 'business_partner' }) {
  if (!mongoose.isValidObjectId(id)) notFound()
  const doc = await Models.User.findOne({ _id: id, userType: type }).select('-password').lean()
  if (!doc) notFound()
  const u = plain<any>(doc)
  const [promotions, leads, referrals, txns, withdrawals, bids] = await Promise.all([
    Models.Promotion.find({ promoter: id }).select('clicks inquiries conversions').lean(),
    Models.Interest.countDocuments({ promoter: id }),
    Models.Referral.countDocuments({ referrer: id }),
    Models.Transaction.find({ promoter: id }).populate('property', 'title').sort('-transactionDate').limit(20).lean(),
    Models.Withdrawal.find({ promoter: id }).sort('-createdAt').limit(20).lean(),
    type === 'business_partner' ? Models.Bid.find({ bidder: id }).populate('bidNotice', 'transactionNumber client').sort('-createdAt').limit(10).lean() : Promise.resolve([]),
  ])
  const pp = u.promoterProfile || {}
  const bp = u.businessPartnerProfile || {}
  const bank = pp.bankDetails?.accountNumber ? pp.bankDetails : bp.bankDetails
  const clicks = (promotions as any[]).reduce((s, p) => s + (p.clicks || 0), 0)
  const base = type === 'promoter' ? '/superadmin/promoters' : '/superadmin/business-partners'
  const paid = bp.paymentStatus === 'confirmed' || pp.paymentStatus === 'confirmed'
  const status = u.isSuspended ? 'suspended' : type === 'business_partner' ? (paid ? 'active' : bp.paymentStatus || 'pending') : pp.rejected ? 'rejected' : pp.isApproved ? 'approved' : 'pending'

  return (
    <>
      <DashHeader
        back={{ label: type === 'promoter' ? '← Promoters' : '← Business partners', href: base }}
        title={u.name}
        intro={<span className="inline-flex flex-wrap items-center gap-2"><StatusPill status={status} /> <span className="text-muted">Joined {formatDate(u.createdAt)}</span></span>}
        actions={
          <Actions>
            {type === 'promoter' && !pp.isApproved && <Act action={approvePromoter} id={u._id} variant="ok" label="Approve" />}
            {type === 'promoter' && !pp.isApproved && !pp.rejected && <Act action={rejectPromoter} id={u._id} variant="danger" label="Decline" ask={[{ name: 'reason', label: 'Reason', type: 'textarea' }]} />}
            <Act action={toggleUserSuspended} id={u._id} variant={u.isSuspended ? 'ghost' : 'danger'} label={u.isSuspended ? 'Restore account' : 'Suspend'} confirm={u.isSuspended ? undefined : 'They’ll be signed out and can’t sign in until restored.'} submitLabel="Suspend" />
          </Actions>
        }
      />

      {type === 'business_partner' && !paid && (
        <Panel className="mb-6 border-lagoon" title="Registration payment" intro="Business partners pay ₦20,000 to join. Check the transfer, then confirm to activate their dashboard.">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
            <KeyValue items={[
              ['Amount', naira(bp.paymentAmount || 20000)],
              ['Reference', bp.paymentReference || '—'],
              ['Paid on', formatDate(bp.paymentDate) || '—'],
              ['Proof', <DocLink key="p" url={bp.paymentProofUrl} label="Open receipt" />],
              ['Status', <StatusPill key="s" status={bp.paymentStatus || 'pending'} />],
              ...(bp.paymentNotes ? [['Notes', bp.paymentNotes] as [string, string]] : []),
            ]} />
            <Actions>
              <Act action={confirmPartnerPayment} id={u._id} variant="ok" label="Confirm payment" ask={[{ name: 'note', label: 'Internal note', placeholder: 'e.g. Seen in GTB statement 14 Oct' }]} submitLabel="Confirm and activate" />
              {bp.paymentStatus !== 'rejected' && <Act action={rejectPartnerPayment} id={u._id} variant="danger" label="Can’t confirm" ask={[{ name: 'reason', label: 'Reason (emailed to them)', type: 'textarea', required: true }]} submitLabel="Send" />}
            </Actions>
          </div>
        </Panel>
      )}

      <StatGrid>
        <Stat label="Total earned" value={naira(pp.totalEarnings || 0)} accent />
        <Stat label="Available to withdraw" value={naira(pp.pendingWithdrawal || 0)} />
        <Stat label="Link clicks" value={clicks.toLocaleString('en-NG')} hint={`${(promotions as any[]).length} property links`} />
        <Stat label="Leads & referrals" value={(leads + referrals).toLocaleString('en-NG')} hint={`${leads} leads · ${referrals} referrals`} />
      </StatGrid>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <div className="grid content-start gap-6">
          <Panel title="Contact">
            <KeyValue items={[
              ['Email', <a key="e" href={`mailto:${u.email}`} className="link">{u.email}</a>],
              ['Phone', u.phone ? <a key="p" href={`tel:${u.phone}`} className="link">{u.phone}</a> : '—'],
              ['Social handle', pp.socialHandle || bp.socialHandle],
              ['Experience', pp.experience || bp.experience],
            ]} />
          </Panel>
          <Panel title="Payout account">
            {bank?.accountNumber ? (
              <KeyValue items={[['Bank', bank.bankName], ['Account number', bank.accountNumber], ['Account name', bank.accountName]]} />
            ) : <p className="text-muted">Not added yet.</p>}
          </Panel>
        </div>
        <div className="grid content-start gap-6">
          <Panel title="Withdrawals" pad={false} action={<Link href={`/superadmin/withdrawals`} className="text-sm font-semibold text-teal-ink hover:text-ink">All withdrawals</Link>}>
            {(withdrawals as any[]).length === 0 ? <EmptyState title="No withdrawal requests" /> : (
              <Table head={['Requested', 'Amount', 'Status', 'Reference']}>
                {plain<any[]>(withdrawals).map((w) => (
                  <tr key={w._id}><td className="whitespace-nowrap text-muted">{formatDate(w.createdAt)}</td><td>{naira(w.amount)}</td><td><StatusPill status={w.status} /></td><td className="text-sm text-muted">{w.transactionReference || w.adminNotes || '—'}</td></tr>
                ))}
              </Table>
            )}
          </Panel>
          <Panel title="Deals" pad={false}>
            {(txns as any[]).length === 0 ? <EmptyState title="No deals yet" body="Deals this account brings in are recorded under Transactions." /> : (
              <Table head={['Property', 'Date', 'Commission', 'Status']}>
                {plain<any[]>(txns).map((t) => (
                  <tr key={t._id}>
                    <td><Link href={`/superadmin/transactions/${t._id}`} className="font-medium text-ink hover:text-teal-ink">{t.property?.title || 'Deleted property'}</Link></td>
                    <td className="whitespace-nowrap text-muted">{formatDate(t.transactionDate)}</td>
                    <td>{naira(t.commissionSplit?.promoter?.amount || 0)}</td>
                    <td><StatusPill status={t.paymentStatus} /></td>
                  </tr>
                ))}
              </Table>
            )}
          </Panel>
          {type === 'business_partner' && (
            <Panel title="Bids" pad={false}>
              {(bids as any[]).length === 0 ? <EmptyState title="No bids yet" /> : (
                <Table head={['Notice', 'Lots', 'Placed', 'Status']}>
                  {plain<any[]>(bids).map((b) => (
                    <tr key={b._id}>
                      <td>{b.bidNotice ? <Link href={`/superadmin/bid-notices/${b.bidNotice._id}`} className="font-medium text-ink hover:text-teal-ink">{b.bidNotice.transactionNumber}</Link> : 'Deleted notice'}</td>
                      <td>{b.numberOfLots}</td>
                      <td className="whitespace-nowrap text-muted">{formatDate(b.createdAt)}</td>
                      <td><StatusPill status={b.status} /></td>
                    </tr>
                  ))}
                </Table>
              )}
            </Panel>
          )}
        </div>
      </div>
    </>
  )
}
