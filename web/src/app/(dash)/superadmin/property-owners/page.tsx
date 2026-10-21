import type { Metadata } from 'next'
import { Models } from '@/lib/legacy'
import { requireAdmin, pageOf, rx, PAGE } from '@/lib/admin'
import { plain } from '@/lib/guard'
import { formatDate } from '@/lib/format'
import { DashHeader, Panel, EmptyState, StatusPill, Table } from '@/components/dash/ui'
import { Filters } from '@/components/admin/Filters'
import { Who, Pager } from '@/components/admin/ui'

export const metadata: Metadata = { title: 'Property owners' }

/* eslint-disable @typescript-eslint/no-explicit-any */
type SP = { q?: string; page?: string }

export default async function Owners({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin()
  const sp = await searchParams
  const page = pageOf(sp.page)
  const query: any = { userType: 'property_owner' }
  if (sp.q) query.$or = [{ name: rx(sp.q) }, { email: rx(sp.q) }, { phone: rx(sp.q) }, { 'propertyOwnerProfile.company': rx(sp.q) }]
  const [items, total] = await Promise.all([
    Models.User.find(query).select('-password').sort('-createdAt').skip((page - 1) * PAGE).limit(PAGE).lean(),
    Models.User.countDocuments(query),
  ])
  const list = plain<any[]>(items)
  const ids = list.map((u) => u._id)
  const props = await Models.Property.find({ owner: { $in: ids } }).select('owner verificationStatus').lean()
  const counts: Record<string, { all: number; live: number }> = {}
  for (const p of props as any[]) {
    const k = String(p.owner)
    counts[k] = counts[k] || { all: 0, live: 0 }
    counts[k].all++
    if (p.verificationStatus === 'verified') counts[k].live++
  }

  return (
    <>
      <DashHeader title="Property owners" intro="Everyone who lists property on Revaamp." />
      <Filters search="Search name, email, phone or company" />
      <Panel pad={false}>
        {list.length === 0 ? <EmptyState title="No property owners match" /> : (
          <Table head={['Owner', 'Company', 'Listings', 'Joined', 'Status']}>
            {list.map((u) => (
              <tr key={u._id}>
                <td><Who name={u.name} sub={`${u.email} · ${u.phone || ''}`} href={`/superadmin/property-owners/${u._id}`} /></td>
                <td className="text-ink-2">{u.propertyOwnerProfile?.company || '—'}</td>
                <td className="whitespace-nowrap">{counts[u._id]?.all || 0} <span className="text-sm text-muted">({counts[u._id]?.live || 0} live)</span></td>
                <td className="whitespace-nowrap text-muted">{formatDate(u.createdAt)}</td>
                <td><StatusPill status={u.isSuspended ? 'suspended' : 'active'} /></td>
              </tr>
            ))}
          </Table>
        )}
        <Pager page={page} pages={Math.ceil(total / PAGE)} total={total} base="/superadmin/property-owners" params={sp as Record<string, string>} />
      </Panel>
    </>
  )
}
