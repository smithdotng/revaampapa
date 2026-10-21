import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, ArrowRight } from 'lucide-react'
import { requireRole, plain } from '@/lib/guard'
import { Models } from '@/lib/legacy'
import { naira, place, PROPERTY_TYPES } from '@/lib/format'
import { DashHeader, Stat, StatGrid, Panel, EmptyState, StatusPill } from '@/components/dash/ui'
import { SmartImage } from '@/components/SmartImage'

export const metadata: Metadata = { title: 'Your properties' }

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function OwnerDashboard({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const v = await requireRole('property_owner')
  const { status } = await searchParams
  const all: any[] = plain(await Models.Property.find({ owner: v.id }).select('title slug price images verificationStatus status views propertyType transactionType location createdAt verificationFeedback').sort('-createdAt').lean())
  const newInquiries = await Models.Inquiry.countDocuments({ propertyOwner: v.id, status: 'new' })

  const count = (s: string) => all.filter((p) => p.verificationStatus === s).length
  const awaiting = all.filter((p) => p.verificationStatus === 'pending_payment')
  const rejected = all.filter((p) => p.verificationStatus === 'rejected')
  const filters = [
    ['', 'All', all.length],
    ['verified', 'Live', count('verified')],
    ['pending_payment', 'Awaiting fee', awaiting.length],
    ['review', 'In review', count('payment_confirmed') + count('verification_pending')],
    ['rejected', 'Needs changes', rejected.length],
  ] as const
  const list = !status ? all : status === 'review' ? all.filter((p) => ['payment_confirmed', 'verification_pending'].includes(p.verificationStatus)) : all.filter((p) => p.verificationStatus === status)

  return (
    <>
      <DashHeader
        title={`Welcome, ${v.name.split(' ')[0]}`}
        intro="Your listings, their review status and how they’re performing."
        actions={<Link href="/property-owner/properties/add" className="btn btn-primary"><Plus className="size-4" aria-hidden /> Add property</Link>}
      />

      {(awaiting.length > 0 || rejected.length > 0 || newInquiries > 0) && (
        <div className="mb-6 grid gap-3">
          {awaiting.length > 0 && (
            <Link href={`/property-owner/properties/pay-verification/${awaiting[0]._id}`} className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-roof/40 bg-roof-soft px-5 py-4 text-[#7a3a0a] hover:border-roof">
              <span><strong className="font-semibold">{awaiting.length === 1 ? `“${awaiting[0].title}” is waiting for its verification fee.` : `${awaiting.length} listings are waiting for their verification fee.`}</strong> Pay ₦20,000 per listing to send it for review.</span>
              <ArrowRight className="size-5 shrink-0" aria-hidden />
            </Link>
          )}
          {rejected.length > 0 && (
            <Link href={`/property-owner/properties/${rejected[0]._id}`} className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-danger/30 bg-danger-soft px-5 py-4 text-danger hover:border-danger">
              <span><strong className="font-semibold">{rejected.length === 1 ? `“${rejected[0].title}” needs changes.` : `${rejected.length} listings need changes.`}</strong> See the reviewer’s note and update the listing.</span>
              <ArrowRight className="size-5 shrink-0" aria-hidden />
            </Link>
          )}
          {newInquiries > 0 && (
            <Link href="/property-owner/inquiries?status=new" className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-teal/30 bg-mist px-5 py-4 text-lagoon hover:border-teal">
              <span><strong className="font-semibold">{newInquiries} new {newInquiries === 1 ? 'enquiry' : 'enquiries'}</strong> from interested buyers.</span>
              <ArrowRight className="size-5 shrink-0" aria-hidden />
            </Link>
          )}
        </div>
      )}

      <StatGrid>
        <Stat label="Live listings" value={count('verified')} hint={`${all.length} in total`} accent />
        <Stat label="In review" value={count('payment_confirmed') + count('verification_pending')} hint="Usually 24–48 hours" />
        <Stat label="Listing views" value={all.reduce((s, p) => s + (p.views || 0), 0).toLocaleString()} />
        <Stat label="Portfolio value" value={naira(all.reduce((s, p) => s + (p.price || 0), 0), { compact: true })} />
      </StatGrid>

      <Panel className="mt-6" pad={false} title="Your properties"
        action={
          <nav aria-label="Filter" className="flex flex-wrap gap-1">
            {filters.map(([k, label, n]) => (
              <Link key={k} href={k ? `?status=${k}` : '?'} aria-current={(status || '') === k ? 'page' : undefined}
                className="rounded-full px-3 py-1 text-sm font-medium text-muted hover:text-ink aria-[current=page]:bg-ink aria-[current=page]:text-white">
                {label} <span className="opacity-60">{n}</span>
              </Link>
            ))}
          </nav>
        }>
        {list.length === 0 ? (
          <EmptyState
            title={all.length ? 'Nothing in this view' : 'List your first property'}
            body={all.length ? 'Try another filter.' : 'It takes about five minutes. Add photos, a description and the price, then pay the verification fee.'}
            action={!all.length && <Link href="/property-owner/properties/add" className="btn btn-primary">Add property</Link>}
          />
        ) : (
          <ul className="divide-y divide-line">
            {list.map((p) => {
              const img = (p.images || []).find((i: any) => i.isPrimary)?.url || p.images?.[0]?.url
              return (
                <li key={p._id} className="relative flex items-center gap-4 px-5 py-4 hover:bg-paper/60 sm:px-6">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-mist sm:h-16 sm:w-24">
                    <SmartImage src={img} alt="" sizes="96px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/property-owner/properties/${p._id}`} className="line-clamp-1 font-semibold text-ink after:absolute after:inset-0">{p.title}</Link>
                    <p className="mt-0.5 truncate text-sm text-muted">{naira(p.price)} / {PROPERTY_TYPES[p.propertyType]} / {place(p.location) || '—'}</p>
                  </div>
                  <div className="hidden text-right text-sm text-muted md:block">{(p.views || 0).toLocaleString()} views</div>
                  <StatusPill status={p.verificationStatus} label={p.verificationStatus === 'verified' && p.status !== 'available' ? (p.status === 'sold' ? 'Sold' : p.status === 'rented' ? 'Rented' : 'Unavailable') : undefined} />
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </>
  )
}
