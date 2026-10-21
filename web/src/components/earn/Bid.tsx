import { requireRole, plain } from '@/lib/guard'
import { Models } from '@/lib/legacy'
import { naira, formatDate } from '@/lib/format'
import { DashHeader, Panel, EmptyState, Table, StatusPill } from '@/components/dash/ui'
import { BidForm } from './BidForm'

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function PartnerBids({ noticeId }: { noticeId?: string }) {
  const v = await requireRole('business_partner')
  const [notices, bids] = await Promise.all([
    Models.BidNotice.find({ status: 'active' }).sort('-createdAt').lean(),
    Models.Bid.find({ bidder: v.id }).populate('bidNotice', 'transactionNumber client transactionCostPerLot profitPerLot').sort('-createdAt').lean(),
  ])
  const ns = plain<any[]>(notices)
  const open = ns.filter((n) => new Date(n.deadline) > new Date())
  return (
    <>
      <DashHeader title="Bids" intro="Premium Discount Forward and Supply Contracts open to Revaamp business partners." />
      {open.length === 0 ? (
        <Panel><EmptyState title="No open bid notices right now" body="New contracts are posted regularly. We’ll show them here as soon as they open." /></Panel>
      ) : (
        <div className="grid gap-5">
          {open.map((n) => (
            <Panel key={n._id} title={<>{n.title} <span className="font-normal text-muted">#{n.transactionNumber}</span></>} intro={`Client: ${n.client}. Closes ${new Date(n.deadline).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}`}>
              <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                <div className="grid content-start gap-4">
                  <p className="whitespace-pre-wrap text-ink-2">{n.description}</p>
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[['Lots available', n.totalLots], ['Price per lot', naira(n.transactionPricePerLot)], ['Cost per lot', naira(n.transactionCostPerLot)], ['Profit per lot', naira(n.profitPerLot)]].map(([k, val]) => (
                      <div key={k as string} className="rounded-[var(--radius-sm)] bg-paper p-3"><dt className="text-xs text-muted">{k}</dt><dd className="font-display text-lg font-semibold">{val}</dd></div>
                    ))}
                  </dl>
                  {[['Conditions', n.conditions], ['How lots are allocated', n.allocationCriteria], ['Important', n.importantNotes]].map(([t, list]) => (list as string[])?.length ? (
                    <div key={t as string}><p className="text-sm font-semibold">{t}</p><ul className="mt-1 list-disc pl-5 text-sm text-ink-2">{(list as string[]).map((x) => <li key={x}>{x}</li>)}</ul></div>
                  ) : null)}
                  <p className="text-sm text-muted">Pay within {n.paymentDays} days of allocation. Partners are paid within {n.paymentToPartnerDays} days.</p>
                </div>
                <div className="rounded-[var(--radius-md)] border border-line p-5" id={noticeId === n._id ? 'bid' : undefined}>
                  <BidForm noticeId={n._id} maxLots={n.totalLots} costPerLot={n.transactionCostPerLot} profitPerLot={n.profitPerLot} />
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}
      <Panel className="mt-6" title="Your bids" pad={false}>
        {bids.length ? (
          <Table head={['Transaction', 'Lots', 'Total cost', 'Placed', 'Status']}>
            {plain<any[]>(bids).map((b) => <tr key={b._id}><td className="font-medium">#{b.bidNotice?.transactionNumber} <span className="text-muted">{b.bidNotice?.client}</span></td><td>{b.numberOfLots}</td><td>{naira(b.totalCost || 0)}</td><td>{formatDate(b.createdAt)}</td><td><StatusPill status={b.status} /></td></tr>)}
          </Table>
        ) : <EmptyState title="You haven’t placed a bid yet" />}
      </Panel>
    </>
  )
}
