import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Models, mongoose } from '@/lib/legacy'
import { requireAdmin } from '@/lib/admin'
import { plain } from '@/lib/guard'
import { naira, formatDate } from '@/lib/format'
import { DashHeader, Panel, EmptyState, StatusPill, Table, Stat, StatGrid, KeyValue } from '@/components/dash/ui'
import { Who, Actions } from '@/components/admin/ui'
import { Act } from '@/components/admin/Act'
import { closeBidNotice, deleteBidNotice, setBidStatus } from '@/actions/admin'

export const metadata: Metadata = { title: 'Bid notice' }

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function BidNoticeDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  if (!mongoose.isValidObjectId(id)) notFound()
  const [doc, bidDocs] = await Promise.all([
    Models.BidNotice.findById(id).lean(),
    Models.Bid.find({ bidNotice: id }).populate('bidder', 'name email phone').sort('createdAt').lean(),
  ])
  if (!doc) notFound()
  const n = plain<any>(doc)
  const bids = plain<any[]>(bidDocs)
  const allocated = bids.filter((b) => b.status === 'approved').reduce((t, b) => t + b.numberOfLots, 0)
  const requested = bids.reduce((t, b) => t + b.numberOfLots, 0)
  const remaining = Math.max(0, n.totalLots - allocated)
  const List = ({ items }: { items?: string[] }) => items?.length ? <ul className="list-disc space-y-1 pl-5">{items.map((x, i) => <li key={i}>{x}</li>)}</ul> : <span className="text-muted">None</span>

  return (
    <>
      <DashHeader back={{ label: '← Bid notices', href: '/superadmin/bid-notices' }} title={n.transactionNumber} intro={n.client}
        actions={<Actions>
          <Act action={closeBidNotice} id={n._id} label={n.status === 'closed' ? 'Reopen bidding' : 'Close bidding'} />
          <Act action={deleteBidNotice} id={n._id} variant="danger" label="Delete" confirm="Delete this notice and every bid on it?" submitLabel="Delete notice" />
        </Actions>} />
      <StatGrid>
        <Stat label="Lots allocated" value={`${allocated} / ${n.totalLots}`} hint={`${remaining} left`} accent />
        <Stat label="Lots requested" value={requested} hint={`${bids.length} bid${bids.length === 1 ? '' : 's'}`} />
        <Stat label="Transaction value" value={naira(n.totalLots * n.transactionPricePerLot, { compact: true })} />
        <Stat label="Status" value={<StatusPill status={n.status} label={n.status === 'active' ? 'Open' : undefined} />} hint={`Closes ${formatDate(n.deadline)}`} />
      </StatGrid>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <Panel pad={false} title="Bids" intro={remaining === 0 ? 'Every lot is allocated.' : `Allocate up to ${remaining} more lot${remaining === 1 ? '' : 's'}.`}>
          {bids.length === 0 ? <EmptyState title="No bids yet" body="Business partners bid from the Bid page of their dashboard." /> : (
            <Table head={['Partner', 'Lots', 'Funding', 'Status', '']}>
              {bids.map((b) => (
                <tr key={b._id}>
                  <td><Who name={b.bidder?.name || 'Deleted account'} sub={b.bidder?.phone || b.bidder?.email} href={b.bidder ? `/superadmin/business-partners/${b.bidder._id}` : undefined} />{b.message && <p className="mt-1 max-w-[260px] text-sm text-ink-2">“{b.message}”</p>}</td>
                  <td>{b.numberOfLots}</td>
                  <td className="whitespace-nowrap">{naira(b.totalCost || b.numberOfLots * n.transactionCostPerLot)}</td>
                  <td><StatusPill status={b.status} label={b.status === 'approved' ? 'Allocated' : undefined} />{b.adminNote && <p className="mt-1 max-w-[200px] text-xs text-muted">{b.adminNote}</p>}</td>
                  <td>
                    <Actions>
                      {b.status !== 'approved' && <Act action={setBidStatus} id={b._id} extra={{ status: 'approved' }} variant="ok" label="Allocate" ask={[{ name: 'note', label: 'Note to the partner (emailed)', type: 'textarea' }]} submitLabel="Allocate and email" />}
                      {b.status !== 'rejected' && <Act action={setBidStatus} id={b._id} extra={{ status: 'rejected' }} variant="danger" label="Decline" ask={[{ name: 'note', label: 'Reason (emailed)', type: 'textarea' }]} submitLabel="Decline and email" />}
                    </Actions>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>
        <div className="grid content-start gap-6">
          <Panel title="Terms">
            <KeyValue items={[
              ['Price per lot', naira(n.transactionPricePerLot)],
              ['Cost per lot', naira(n.transactionCostPerLot)],
              ['Profit per lot', naira(n.profitPerLot)],
              ['Deadline', n.deadlineText || formatDate(n.deadline)],
              ['Payment due', `${n.paymentDays} days after allocation`],
              ['Partners paid', `${n.paymentToPartnerDays} days after payment`],
            ]} />
            <p className="mt-4 whitespace-pre-wrap text-sm text-ink-2">{n.description}</p>
          </Panel>
          <Panel title="Conditions"><div className="text-sm text-ink-2"><List items={n.conditions} /></div></Panel>
          <Panel title="Allocation criteria"><div className="text-sm text-ink-2"><List items={n.allocationCriteria} /></div></Panel>
          {n.importantNotes?.length > 0 && <Panel title="Important notes"><div className="text-sm text-ink-2"><List items={n.importantNotes} /></div></Panel>}
        </div>
      </div>
    </>
  )
}
