import type { Metadata } from 'next'
import { Download } from 'lucide-react'
import { Models } from '@/lib/legacy'
import { requireAdmin, pageOf, PAGE, qs, inquiryQuery } from '@/lib/admin'
import { plain } from '@/lib/guard'
import { DashHeader, Panel, EmptyState, Tabs } from '@/components/dash/ui'
import { Filters } from '@/components/admin/Filters'
import { Pager } from '@/components/admin/ui'
import { InquiryTable } from '@/components/admin/InquiryTable'

export const metadata: Metadata = { title: 'Enquiries' }

/* eslint-disable @typescript-eslint/no-explicit-any */
type SP = { status?: string; q?: string; page?: string; from?: string; to?: string }

export default async function AdminInquiries({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin()
  const sp = await searchParams
  const page = pageOf(sp.page)
  const query = inquiryQuery(sp)
  const statuses = ['new', 'read', 'replied', 'archived', 'spam']
  const [items, total, all, ...counts] = await Promise.all([
    Models.Inquiry.find(query).populate('property', 'title slug').populate('propertyOwner', 'name').sort('-createdAt').skip((page - 1) * PAGE).limit(PAGE).lean(),
    Models.Inquiry.countDocuments(query),
    Models.Inquiry.countDocuments(),
    ...statuses.map((s) => Models.Inquiry.countDocuments({ status: s })),
  ])
  const rows = plain<any[]>(items).map((i) => ({ ...i, owner: i.propertyOwner?.name }))
  const tab = (status: string) => `/superadmin/inquiries${qs({ status, q: sp.q, from: sp.from, to: sp.to })}`
  const label: Record<string, string> = { new: 'New', read: 'Read', replied: 'Replied', archived: 'Archived', spam: 'Spam' }

  return (
    <>
      <DashHeader title="Enquiries" intro="Every enquiry buyers send from a property page. Owners reply from their own dashboard; offline listings come to you."
        actions={<a href={`/superadmin/inquiries/export${qs({ status: sp.status, q: sp.q, from: sp.from, to: sp.to })}`} className="btn btn-ghost"><Download className="size-4" aria-hidden /> Export CSV</a>} />
      <Tabs items={[{ label: 'All', href: tab(''), active: !sp.status, count: all }, ...statuses.map((s, i) => ({ label: label[s], href: tab(s), active: sp.status === s, count: counts[i] as number }))]} />
      <Filters search="Search name, email, phone or message" dates />
      <Panel pad={false}>
        {rows.length === 0 ? <EmptyState title="No enquiries match" body="Try a different filter or date range." /> : <InquiryTable rows={rows} />}
        <Pager page={page} pages={Math.ceil(total / PAGE)} total={total} base="/superadmin/inquiries" params={sp as Record<string, string>} />
      </Panel>
    </>
  )
}
