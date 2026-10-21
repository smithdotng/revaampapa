import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Check, ExternalLink, Pencil } from 'lucide-react'
import { requireRole, plain } from '@/lib/guard'
import { Models } from '@/lib/legacy'
import { naira, place, formatDate, PROPERTY_TYPES, TRANSACTION_TYPES } from '@/lib/format'
import { DashHeader, Panel, StatusPill, KeyValue, Stat, StatGrid } from '@/components/dash/ui'
import { ConfirmAction } from '@/components/dash/client'
import { deleteProperty } from '@/actions/owner'

export const metadata: Metadata = { title: 'Property' }

/* eslint-disable @typescript-eslint/no-explicit-any */
const STEPS = [
  ['pending_payment', 'Listing saved'],
  ['payment_confirmed', 'Fee submitted'],
  ['verification_pending', 'Reviewed by our team'],
  ['verified', 'Live on RevaampAPA'],
] as const

export default async function OwnerProperty({ params }: { params: Promise<{ id: string }> }) {
  const v = await requireRole('property_owner')
  const { id } = await params
  const p: any = plain(await Models.Property.findById(id).lean().catch(() => null))
  if (!p || String(p.owner) !== v.id) notFound()
  const enquiries = await Models.Inquiry.countDocuments({ property: id })
  const fresh = await Models.Inquiry.countDocuments({ property: id, status: 'new' })
  const order = ['pending_payment', 'payment_confirmed', 'verification_pending', 'verified']
  const at = p.verificationStatus === 'rejected' ? -1 : order.indexOf(p.verificationStatus)
  const del = deleteProperty.bind(null, id)

  return (
    <>
      <DashHeader
        back={{ label: 'All properties', href: '/property-owner/dashboard' }}
        title={p.title}
        intro={<span className="flex flex-wrap items-center gap-3"><StatusPill status={p.verificationStatus} /> <span>{naira(p.price)} / {TRANSACTION_TYPES[p.transactionType]} / {place(p.location)}</span></span>}
        actions={
          <>
            {p.verificationStatus === 'pending_payment' && <Link href={`/property-owner/properties/pay-verification/${id}`} className="btn btn-primary">Pay verification fee</Link>}
            {p.verificationStatus !== 'verified' && <Link href={`/property-owner/properties/${id}/edit`} className="btn btn-ghost"><Pencil className="size-4" aria-hidden /> Edit</Link>}
            {p.verificationStatus === 'verified' && <Link href={`/properties/${p.slug}`} className="btn btn-ghost" target="_blank"><ExternalLink className="size-4" aria-hidden /> View live listing</Link>}
          </>
        }
      />

      {p.verificationStatus === 'rejected' && (
        <div role="alert" className="mb-6 rounded-[var(--radius-md)] border border-danger/30 bg-danger-soft p-5 text-danger">
          <p className="font-semibold">This listing needs changes before it can go live</p>
          <p className="mt-1">{p.verificationFeedback?.message || 'Our team couldn’t verify it. Edit the listing or contact info@revaampapa.com.'}</p>
          <Link href={`/property-owner/properties/${id}/edit`} className="btn btn-primary mt-4">Update the listing</Link>
        </div>
      )}

      {at >= 0 && (
        <Panel title="Where it’s at" className="mb-6">
          <ol className="grid gap-4 sm:grid-cols-4">
            {STEPS.map(([key, label], i) => {
              const done = i <= at
              return (
                <li key={key} className="flex items-center gap-3 sm:flex-col sm:items-start">
                  <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${done ? 'bg-lagoon text-white' : 'border border-line-2 text-muted'}`}>
                    {done ? <Check className="size-4" aria-hidden /> : i + 1}
                  </span>
                  <span className={`text-sm ${done ? 'font-semibold text-ink' : 'text-muted'}`}>{label}</span>
                </li>
              )
            })}
          </ol>
          {p.verificationStatus === 'payment_confirmed' && <p className="mt-5 text-sm text-ink-2">We received your payment proof on {formatDate(p.verificationPaymentConfirmedAt)}. Verification usually takes 24–48 hours.</p>}
        </Panel>
      )}

      <StatGrid cols={3}>
        <Stat label="Views" value={(p.views || 0).toLocaleString()} />
        <Stat label="Enquiries" value={enquiries} hint={fresh ? `${fresh} new` : undefined} />
        <Stat label="Agency fee (10%)" value={naira(p.agencyFee || p.price * 0.1)} />
      </StatGrid>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Photos" pad={false}>
          <ul className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
            {(p.images || []).map((img: any) => (
              <li key={img.url} className="aspect-[4/3] overflow-hidden rounded-[var(--radius-sm)] bg-mist">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-full w-full object-cover" loading="lazy" />
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Details">
          <KeyValue items={[
            ['Type', PROPERTY_TYPES[p.propertyType]],
            ['Deal', TRANSACTION_TYPES[p.transactionType]],
            ['Price', `${naira(p.price)}${p.priceNegotiable ? ' (negotiable)' : ''}`],
            ['Address', [p.location?.address, p.location?.lga, place(p.location)].filter(Boolean).join(', ')],
            ['Listed', formatDate(p.createdAt)],
            ['Payment reference', p.verificationPaymentReference],
          ]} />
          {enquiries > 0 && <Link href={`/property-owner/inquiries?property=${id}`} className="link mt-5 inline-block text-sm font-medium">See enquiries for this property</Link>}
        </Panel>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
        <p className="text-sm text-muted">Deleting removes the listing and its photos permanently.</p>
        <ConfirmAction action={del} label="Delete property" confirmLabel="Delete permanently" pendingLabel="Deleting…" note="This can’t be undone." />
      </div>
    </>
  )
}
