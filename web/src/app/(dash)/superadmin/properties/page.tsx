import type { Metadata } from 'next'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { Models } from '@/lib/legacy'
import { requireAdmin, pageOf, rx, PAGE, qs } from '@/lib/admin'
import { plain } from '@/lib/guard'
import { naira, formatDate, place, PROPERTY_TYPES } from '@/lib/format'
import { DashHeader, Panel, EmptyState, StatusPill, Table, Tabs } from '@/components/dash/ui'
import { Filters } from '@/components/admin/Filters'
import { Who, Pager } from '@/components/admin/ui'

export const metadata: Metadata = { title: 'Properties' }

/* eslint-disable @typescript-eslint/no-explicit-any */
type SP = { status?: string; type?: string; q?: string; page?: string; featured?: string }

export default async function AdminProperties({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin()
  const sp = await searchParams
  const page = pageOf(sp.page)
  const query: any = {}
  if (sp.status) query.verificationStatus = sp.status
  if (sp.type) query.propertyType = sp.type
  if (sp.featured) query.featured = true
  if (sp.q) query.$or = [{ title: rx(sp.q) }, { 'location.city': rx(sp.q) }, { 'location.state': rx(sp.q) }, { 'externalOwner.name': rx(sp.q) }]

  const [items, total, all, review, verified, rejected, awaiting] = await Promise.all([
    Models.Property.find(query).populate('owner', 'name email').sort('-createdAt').skip((page - 1) * PAGE).limit(PAGE).lean(),
    Models.Property.countDocuments(query),
    Models.Property.countDocuments(),
    Models.Property.countDocuments({ verificationStatus: 'payment_confirmed' }),
    Models.Property.countDocuments({ verificationStatus: 'verified' }),
    Models.Property.countDocuments({ verificationStatus: 'rejected' }),
    Models.Property.countDocuments({ verificationStatus: 'pending_payment' }),
  ])
  const list = plain<any[]>(items)
  const tab = (status: string) => `/superadmin/properties${qs({ status, type: sp.type, q: sp.q })}`

  return (
    <>
      <DashHeader title="Properties" intro="Verify paid listings, feature the best ones and list properties for owners without an account."
        actions={<Link href="/superadmin/properties/add" className="btn btn-primary">List a property</Link>} />
      <Tabs items={[
        { label: 'All', href: tab(''), active: !sp.status, count: all },
        { label: 'To verify', href: tab('payment_confirmed'), active: sp.status === 'payment_confirmed', count: review },
        { label: 'Awaiting fee', href: tab('pending_payment'), active: sp.status === 'pending_payment', count: awaiting },
        { label: 'Verified', href: tab('verified'), active: sp.status === 'verified', count: verified },
        { label: 'Sent back', href: tab('rejected'), active: sp.status === 'rejected', count: rejected },
      ]} />
      <Filters search="Search title, city, state or owner" selects={[
        { name: 'type', label: 'Type', options: [['', 'All types'], ...Object.entries(PROPERTY_TYPES)] },
        { name: 'featured', label: 'Featured', options: [['', 'Any'], ['1', 'Featured only']] },
      ]} />
      <Panel pad={false}>
        {list.length === 0 ? (
          <EmptyState title={sp.status === 'payment_confirmed' ? 'Nothing to verify' : 'No properties match'} body={sp.status === 'payment_confirmed' ? 'Listings appear here once the owner submits proof of the verification fee.' : 'Try a different search or filter.'} />
        ) : (
          <Table head={['Property', 'Owner', 'Type', 'Price', 'Review', 'Added']}>
            {list.map((p) => (
              <tr key={p._id}>
                <td className="max-w-[320px]">
                  <Who name={<span className="inline-flex items-center gap-1.5">{p.featured && <Star className="size-3.5 shrink-0 fill-roof text-roof" aria-label="Featured" />}{p.title}</span>} sub={place(p.location)} href={`/superadmin/properties/${p._id}`} />
                </td>
                <td className="text-ink-2">{p.listedBySuperadmin ? <>{p.externalOwner?.name || '—'} <span className="text-xs text-muted">(offline)</span></> : p.owner?.name || '—'}</td>
                <td className="whitespace-nowrap text-ink-2">{PROPERTY_TYPES[p.propertyType] || p.propertyType}</td>
                <td className="whitespace-nowrap">{naira(p.price, { compact: true })}</td>
                <td><StatusPill status={p.verificationStatus} /></td>
                <td className="whitespace-nowrap text-muted">{formatDate(p.createdAt)}</td>
              </tr>
            ))}
          </Table>
        )}
        <Pager page={page} pages={Math.ceil(total / PAGE)} total={total} base="/superadmin/properties" params={sp as Record<string, string>} />
      </Panel>
    </>
  )
}
