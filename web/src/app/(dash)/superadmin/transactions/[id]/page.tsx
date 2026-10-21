import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Models, mongoose } from '@/lib/legacy'
import { requireAdmin } from '@/lib/admin'
import { plain } from '@/lib/guard'
import { naira, formatDate, place } from '@/lib/format'
import { DashHeader, Panel, StatusPill, KeyValue } from '@/components/dash/ui'
import { Act } from '@/components/admin/Act'
import { Actions } from '@/components/admin/ui'
import { setTransactionStatus } from '@/actions/admin'

export const metadata: Metadata = { title: 'Transaction' }

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function Transaction({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  if (!mongoose.isValidObjectId(id)) notFound()
  const doc = await Models.Transaction.findById(id).populate('property', 'title location price slug owner').populate('promoter', 'name email phone userType').lean()
  if (!doc) notFound()
  const t = plain<any>(doc)
  const cs = t.commissionSplit || {}
  const promoterHref = t.promoter ? `/superadmin/${t.promoter.userType === 'business_partner' ? 'business-partners' : 'promoters'}/${t.promoter._id}` : ''
  return (
    <>
      <DashHeader back={{ label: '← Transactions', href: '/superadmin/transactions' }} title={t.property?.title || 'Deleted property'}
        intro={<span className="inline-flex items-center gap-2"><StatusPill status={t.paymentStatus} /> <span className="text-muted">{formatDate(t.transactionDate)}</span></span>}
        actions={t.paymentStatus === 'pending' ? (
          <Actions>
            <Act action={setTransactionStatus} id={t._id} extra={{ status: 'completed' }} variant="ok" label="Fee received" confirm="Complete this deal and credit the promoter?" submitLabel="Complete" />
            <Act action={setTransactionStatus} id={t._id} extra={{ status: 'failed' }} variant="danger" label="Fell through" confirm="Mark this deal as failed?" submitLabel="Mark failed" />
          </Actions>
        ) : undefined} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Deal">
          <KeyValue items={[
            ['Property', t.property ? <Link key="p" href={`/superadmin/properties/${t.property._id}`} className="link">{t.property.title}</Link> : '—'],
            ['Location', place(t.property?.location)],
            ['Type', t.transactionType],
            ['Amount', naira(t.amount)],
            ['Agency fee', naira(t.agencyFee)],
            ['Reference', t.paymentReference],
            ['Completed', formatDate(t.completedDate)],
            ['Notes', t.notes],
          ]} />
        </Panel>
        <Panel title="Commission split">
          <KeyValue items={[
            ['Promoter', `${naira(cs.promoter?.amount || 0)} (${cs.promoter?.percentage || 0}%)`],
            ['Property owner', `${naira(cs.propertyOwner?.amount || 0)} (${cs.propertyOwner?.percentage || 0}%)`],
            ['Platform', `${naira(cs.platform?.amount || 0)} (${cs.platform?.percentage || 0}%)`],
          ]} />
        </Panel>
        <Panel title="Buyer or tenant">
          <KeyValue items={[['Name', t.buyer?.name], ['Email', t.buyer?.email], ['Phone', t.buyer?.phone]]} />
        </Panel>
        <Panel title="Promoter">
          {t.promoter ? (
            <KeyValue items={[
              ['Name', <Link key="n" href={promoterHref} className="link">{t.promoter.name}</Link>],
              ['Email', t.promoter.email],
              ['Phone', t.promoter.phone],
              ['Link used', t.promoterLink],
            ]} />
          ) : <p className="text-muted">No promoter — a direct deal.</p>}
        </Panel>
      </div>
    </>
  )
}
