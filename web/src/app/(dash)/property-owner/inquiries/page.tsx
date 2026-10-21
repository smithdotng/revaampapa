import type { Metadata } from 'next'
import { requireRole, plain } from '@/lib/guard'
import { Models } from '@/lib/legacy'
import { DashHeader, Panel, EmptyState, Tabs } from '@/components/dash/ui'
import { InquiryItem } from './InquiryItem'

export const metadata: Metadata = { title: 'Enquiries' }

export default async function Inquiries({ searchParams }: { searchParams: Promise<{ status?: string; property?: string }> }) {
  const v = await requireRole('property_owner')
  const { status = '', property } = await searchParams
  const base: Record<string, unknown> = { propertyOwner: v.id }
  if (property) base.property = property
  const q: Record<string, unknown> = { ...base }
  if (status === 'new' || status === 'replied' || status === 'archived' || status === 'spam') q.status = status
  else q.status = { $nin: ['archived', 'spam'] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, counts] = await Promise.all([
    Models.Inquiry.find(q).populate('property', 'title slug').sort('-createdAt').limit(100).lean(),
    Models.Inquiry.aggregate([{ $match: { propertyOwner: v.doc._id } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
  ])
  const c = (s: string) => counts.find((x: { _id: string }) => x._id === s)?.n || 0
  const qs = (s: string) => `?${new URLSearchParams({ ...(s ? { status: s } : {}), ...(property ? { property } : {}) })}`
  const list = plain<unknown[]>(items)

  return (
    <>
      <DashHeader title="Enquiries" intro="Questions from buyers and tenants about your listings. Replies are emailed to them from here." />
      <Tabs items={[
        { label: 'Inbox', href: qs(''), active: !status, count: c('new') + c('read') + c('replied') },
        { label: 'New', href: qs('new'), active: status === 'new', count: c('new') },
        { label: 'Replied', href: qs('replied'), active: status === 'replied', count: c('replied') },
        { label: 'Archived', href: qs('archived'), active: status === 'archived', count: c('archived') },
        { label: 'Spam', href: qs('spam'), active: status === 'spam', count: c('spam') },
      ]} />
      <Panel pad={false}>
        {list.length === 0 ? (
          <EmptyState title={status === 'new' ? 'You’re all caught up' : 'No enquiries here'} body="When someone asks about one of your listings, it shows up here and we email you." />
        ) : (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <ul className="divide-y divide-line">{list.map((x: any, i) => <InquiryItem key={x._id} q={x} open={i === list.findIndex((y: any) => y.status === 'new')} />)}</ul>
        )}
      </Panel>
    </>
  )
}
