import type { Metadata } from 'next'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { Models } from '@/lib/legacy'
import { requireAdmin, pageOf, rx, PAGE, qs } from '@/lib/admin'
import { plain } from '@/lib/guard'
import { formatDate, mediaUrl } from '@/lib/format'
import { DashHeader, Panel, EmptyState, StatusPill, Table, Tabs } from '@/components/dash/ui'
import { Filters } from '@/components/admin/Filters'
import { Who, Pager, Actions } from '@/components/admin/ui'
import { Act } from '@/components/admin/Act'
import { toggleHotel, deleteHotel } from '@/actions/admin'

export const metadata: Metadata = { title: 'Hotels' }

/* eslint-disable @typescript-eslint/no-explicit-any */
type SP = { status?: string; q?: string; page?: string }

export default async function AdminHotels({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin()
  const sp = await searchParams
  const page = pageOf(sp.page)
  const query: any = {}
  if (sp.status === 'active') query.isActive = true
  if (sp.status === 'hidden') query.isActive = false
  if (sp.status === 'featured') query.featured = true
  if (sp.q) query.$or = [{ name: rx(sp.q) }, { 'location.city': rx(sp.q) }, { 'location.state': rx(sp.q) }]

  const [items, total, all, active, hidden, featured] = await Promise.all([
    Models.Hotel.find(query).sort('-createdAt').skip((page - 1) * PAGE).limit(PAGE).lean(),
    Models.Hotel.countDocuments(query),
    Models.Hotel.countDocuments(),
    Models.Hotel.countDocuments({ isActive: true }),
    Models.Hotel.countDocuments({ isActive: false }),
    Models.Hotel.countDocuments({ featured: true }),
  ])
  const list = plain<any[]>(items)
  const tab = (status: string) => `/superadmin/hotels${qs({ status, q: sp.q })}`

  return (
    <>
      <DashHeader title="Hotels" intro="Hotels promoters can share and Room Voucher subscribers can book. Approved partner hotels are added here automatically."
        actions={<Link href="/superadmin/hotels/add" className="btn btn-primary">Add a hotel</Link>} />
      <Tabs items={[
        { label: 'All', href: tab(''), active: !sp.status, count: all },
        { label: 'Listed', href: tab('active'), active: sp.status === 'active', count: active },
        { label: 'Hidden', href: tab('hidden'), active: sp.status === 'hidden', count: hidden },
        { label: 'Featured', href: tab('featured'), active: sp.status === 'featured', count: featured },
      ]} />
      <Filters search="Search name, city or state" />
      <Panel pad={false}>
        {list.length === 0 ? <EmptyState title="No hotels match" body="Add a hotel, or approve a partner hotel application." action={<Link href="/superadmin/hotels/add" className="btn btn-primary">Add a hotel</Link>} /> : (
          <Table head={['Hotel', 'Commission', 'Voucher', 'Bookings', 'Status', '']}>
            {list.map((h) => {
              const cover = (h.images || []).find((i: any) => i.isPrimary) || h.images?.[0]
              return (
                <tr key={h._id}>
                  <td className="max-w-[340px]">
                    <div className="flex items-center gap-3">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mediaUrl(cover.url)} alt="" className="size-12 shrink-0 rounded-[var(--radius-sm)] object-cover" />
                      ) : <span className="size-12 shrink-0 rounded-[var(--radius-sm)] bg-mist" />}
                      <Who name={<span className="inline-flex items-center gap-1.5">{h.featured && <Star className="size-3.5 shrink-0 fill-roof text-roof" aria-label="Featured" />}{h.name}</span>}
                        sub={[h.location?.city, h.location?.state].filter(Boolean).join(', ') || '—'} href={`/superadmin/hotels/${h._id}/edit`} />
                    </div>
                  </td>
                  <td className="whitespace-nowrap">{h.commissionRate ?? 0}%</td>
                  <td className="whitespace-nowrap">{h.voucherDiscountRate ? `${h.voucherDiscountRate}% off` : '—'}</td>
                  <td>{h.totalBookings || 0}</td>
                  <td><StatusPill status={h.isActive ? 'active' : 'inactive'} label={h.isActive ? 'Listed' : 'Hidden'} /><p className="mt-1 text-xs text-muted">Added {formatDate(h.createdAt)}</p></td>
                  <td>
                    <Actions>
                      <Link href={`/superadmin/hotels/${h._id}/edit`} className="btn btn-ghost min-h-10 px-4 text-sm">Edit</Link>
                      <Act action={toggleHotel} id={h._id} extra={{ field: 'isActive' }} label={h.isActive ? 'Hide' : 'List'} />
                      <Act action={toggleHotel} id={h._id} extra={{ field: 'featured' }} label={h.featured ? 'Unfeature' : 'Feature'} />
                      <Act action={deleteHotel} id={h._id} variant="danger" label="Delete" confirm={`Delete ${h.name}? Promoter links to it will stop working.`} submitLabel="Delete hotel" />
                    </Actions>
                  </td>
                </tr>
              )
            })}
          </Table>
        )}
        <Pager page={page} pages={Math.ceil(total / PAGE)} total={total} base="/superadmin/hotels" params={sp as Record<string, string>} />
      </Panel>
    </>
  )
}
