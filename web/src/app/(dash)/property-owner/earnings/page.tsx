import type { Metadata } from 'next'
import { requireRole, plain } from '@/lib/guard'
import { Models } from '@/lib/legacy'
import { naira, formatDate } from '@/lib/format'
import { DashHeader, Stat, StatGrid, Panel, Table, EmptyState, Bars } from '@/components/dash/ui'
import { lastSixMonths } from '@/lib/dash-data'

export const metadata: Metadata = { title: 'Earnings' }

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function OwnerEarnings() {
  const v = await requireRole('property_owner')
  const ids = (await Models.Property.find({ owner: v.id }).select('_id').lean()).map((p: any) => p._id)
  const tx: any[] = plain(await Models.Transaction.find({ property: { $in: ids }, paymentStatus: 'completed' }).populate('property', 'title').sort('-transactionDate').lean())
  const amount = (t: any) => t.commissionSplit?.propertyOwner?.amount || 0
  const total = tx.reduce((s, t) => s + amount(t), 0)
  const sales = tx.reduce((s, t) => s + (t.amount || 0), 0)
  return (
    <>
      <DashHeader title="Earnings" intro="Completed transactions on your listings and your share of each." />
      <StatGrid cols={3}>
        <Stat label="Your earnings" value={naira(total)} accent />
        <Stat label="Completed deals" value={tx.length} />
        <Stat label="Deal value" value={naira(sales, { compact: true })} />
      </StatGrid>
      <Panel className="mt-6" title="Last six months"><Bars data={lastSixMonths(tx, 'transactionDate', amount)} format={(n) => naira(n, { compact: true })} /></Panel>
      <Panel className="mt-6" title="Transactions" pad={false}>
        {tx.length ? (
          <Table head={['Property', 'Date', 'Deal value', 'Your share']}>
            {tx.map((t) => (
              <tr key={t._id}>
                <td className="font-medium">{t.property?.title || '—'}</td>
                <td className="text-muted">{formatDate(t.transactionDate)}</td>
                <td>{naira(t.amount)}</td>
                <td className="font-semibold">{naira(amount(t))}</td>
              </tr>
            ))}
          </Table>
        ) : <EmptyState title="No completed deals yet" body="When a sale or rental on one of your listings completes, it appears here with your share." />}
      </Panel>
    </>
  )
}
