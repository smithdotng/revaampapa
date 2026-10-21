import type { Metadata } from 'next'
import Link from 'next/link'
import { Models } from '@/lib/legacy'
import { requireAdmin } from '@/lib/admin'
import { plain } from '@/lib/guard'
import { naira, formatDate } from '@/lib/format'
import { DashHeader, Panel, EmptyState, StatusPill, Table } from '@/components/dash/ui'
import { Who } from '@/components/admin/ui'

export const metadata: Metadata = { title: 'Bid notices' }

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function BidNotices() {
  await requireAdmin()
  const [notices, bids] = await Promise.all([
    Models.BidNotice.find().sort('-createdAt').lean(),
    Models.Bid.find().select('bidNotice numberOfLots status').lean(),
  ])
  const list = plain<any[]>(notices)
  const by = new Map<string, { count: number; lots: number; allocated: number }>()
  for (const b of bids as any[]) {
    const k = String(b.bidNotice)
    const s = by.get(k) || { count: 0, lots: 0, allocated: 0 }
    s.count++
    s.lots += b.numberOfLots || 0
    if (b.status === 'approved') s.allocated += b.numberOfLots || 0
    by.set(k, s)
  }
  return (
    <>
      <DashHeader title="Bid notices" intro="Transactions offered to value partners in lots. Partners bid from their dashboard; you allocate lots here."
        actions={<Link href="/superadmin/bid-notices/create" className="btn btn-primary">New bid notice</Link>} />
      <Panel pad={false}>
        {list.length === 0 ? <EmptyState title="No bid notices yet" action={<Link href="/superadmin/bid-notices/create" className="btn btn-primary">New bid notice</Link>} /> : (
          <Table head={['Transaction', 'Lots', 'Value', 'Bids', 'Closes', 'Status']}>
            {list.map((n) => {
              const s = by.get(String(n._id)) || { count: 0, lots: 0, allocated: 0 }
              const expired = n.status === 'active' && new Date(n.deadline) < new Date()
              return (
                <tr key={n._id}>
                  <td className="max-w-[320px]"><Who name={n.transactionNumber} sub={n.client} href={`/superadmin/bid-notices/${n._id}`} /></td>
                  <td className="whitespace-nowrap">{s.allocated}/{n.totalLots} allocated</td>
                  <td className="whitespace-nowrap">{naira(n.totalLots * n.transactionPricePerLot, { compact: true })}</td>
                  <td className="whitespace-nowrap">{s.count} bid{s.count === 1 ? '' : 's'} · {s.lots} lots</td>
                  <td className="whitespace-nowrap text-muted">{formatDate(n.deadline)}</td>
                  <td><StatusPill status={expired ? 'expired' : n.status} label={expired ? 'Deadline passed' : n.status === 'active' ? 'Open' : undefined} /></td>
                </tr>
              )
            })}
          </Table>
        )}
      </Panel>
    </>
  )
}
