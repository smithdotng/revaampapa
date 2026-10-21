import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Models } from '@/lib/legacy'
import { requireAdmin, adminCounts } from '@/lib/admin'
import { plain } from '@/lib/guard'
import { naira, formatDate, place } from '@/lib/format'
import { lastSixMonths } from '@/lib/dash-data'
import { DashHeader, Stat, StatGrid, Panel, EmptyState, StatusPill, Table, Bars } from '@/components/dash/ui'
import { Who } from '@/components/admin/ui'

export const metadata: Metadata = { title: 'Overview' }

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function AdminDashboard() {
  const v = await requireAdmin()
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6, 1)

  const [c, live, totalProps, owners, promoters, partners, voucherActive, completed, recentProps, recentInquiries, bids] = await Promise.all([
    adminCounts(),
    Models.Property.countDocuments({ verificationStatus: 'verified', status: 'available' }),
    Models.Property.countDocuments(),
    Models.User.countDocuments({ userType: 'property_owner' }),
    Models.User.countDocuments({ userType: 'promoter' }),
    Models.User.countDocuments({ userType: 'business_partner' }),
    Models.VoucherSubscriber.countDocuments({ 'subscription.status': 'active', isSuspended: { $ne: true } }),
    Models.Transaction.find({ paymentStatus: 'completed' }).select('commissionSplit.platform.amount transactionDate').lean(),
    Models.Property.find().populate('owner', 'name').sort('-createdAt').limit(6).lean(),
    Models.Inquiry.find().populate('property', 'title slug').sort('-createdAt').limit(5).lean(),
    Models.BidNotice.find({ status: 'active' }).sort('-createdAt').limit(3).lean(),
  ])
  const revenue = (completed as any[]).reduce((s, t) => s + (t.commissionSplit?.platform?.amount || 0), 0)
  const months = lastSixMonths(completed as any[], 'transactionDate', (t: any) => t.commissionSplit?.platform?.amount || 0)

  const queue = [
    { n: c.property, label: 'Listings to verify', href: '/superadmin/properties?status=payment_confirmed' },
    { n: c.partner, label: 'Business partner payments to confirm', href: '/superadmin/business-partners?status=pending' },
    { n: c.withdrawal, label: 'Withdrawals to pay', href: '/superadmin/withdrawals?status=pending' },
    { n: c.professionals, label: 'Professional applications', href: '/superadmin/professionals' },
    { n: c.partnerHotel, label: 'Partner hotel applications', href: '/superadmin/partner-hotels?status=pending' },
    { n: c.voucher, label: 'Room Voucher subscriptions to activate', href: '/superadmin/voucher-subscribers?status=pending' },
    { n: c.promoter, label: 'Promoters awaiting approval', href: '/superadmin/promoters?status=pending' },
    { n: c.subscriber, label: 'Bank guarantees to review', href: '/superadmin/project-subscribers?status=guarantee' },
    { n: c.project, label: 'Projects awaiting approval', href: '/superadmin/projects?status=pending_approval' },
    { n: c.inquiry, label: 'New enquiries', href: '/superadmin/inquiries?status=new' },
  ].filter((q) => q.n > 0)

  const props = plain<any[]>(recentProps)
  const inquiries = plain<any[]>(recentInquiries).filter((q) => q.property)
  const notices = plain<any[]>(bids)
  const first = v.name.split(' ')[0]

  return (
    <>
      <DashHeader
        title={`Good to see you, ${first}`}
        intro={queue.length ? `${queue.reduce((s, q) => s + q.n, 0)} things are waiting on you.` : 'Nothing is waiting on you right now.'}
        actions={<Link href="/superadmin/properties/add" className="btn btn-primary">List a property</Link>}
      />

      <StatGrid>
        <Stat label="Live listings" value={live.toLocaleString('en-NG')} hint={`${totalProps.toLocaleString('en-NG')} in total`} accent />
        <Stat label="Platform revenue" value={naira(revenue, { compact: true })} hint="From completed deals" />
        <Stat label="Promoters & partners" value={(promoters + partners).toLocaleString('en-NG')} hint={`${promoters} promoters · ${partners} partners`} />
        <Stat label="Property owners" value={owners.toLocaleString('en-NG')} hint={`${voucherActive} active Room Vouchers`} />
      </StatGrid>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <Panel title="Needs your attention" pad={false}>
          {queue.length === 0 ? (
            <EmptyState title="All clear" body="New applications, payments and listings to verify show up here." />
          ) : (
            <ul className="divide-y divide-line">
              {queue.map((q) => (
                <li key={q.href}>
                  <Link href={q.href} className="group flex items-center gap-4 px-5 py-3.5 hover:bg-paper sm:px-6">
                    <span className="grid min-w-9 place-items-center rounded-full bg-roof-soft px-2 py-1 font-display text-sm font-semibold text-[#a24d0e]">{q.n}</span>
                    <span className="flex-1 font-medium text-ink">{q.label}</span>
                    <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Platform revenue" intro="Platform share of completed deals, last six months">
          <Bars data={months} format={(n) => naira(n, { compact: true })} emptyText="No completed deals in the last six months. Record deals under Transactions." />
        </Panel>
      </div>

      <Panel className="mt-6" title="Newest listings" pad={false} action={<Link href="/superadmin/properties" className="text-sm font-semibold text-teal-ink hover:text-ink">All properties</Link>}>
        {props.length === 0 ? <EmptyState title="No listings yet" /> : (
          <Table head={['Property', 'Owner', 'Price', 'Status', 'Added']}>
            {props.map((p) => (
              <tr key={p._id}>
                <td><Who name={p.title} sub={place(p.location)} href={`/superadmin/properties/${p._id}`} /></td>
                <td className="text-ink-2">{p.listedBySuperadmin ? p.externalOwner?.name || 'Listed by admin' : p.owner?.name || '—'}</td>
                <td className="whitespace-nowrap">{naira(p.price, { compact: true })}</td>
                <td><StatusPill status={p.verificationStatus} /></td>
                <td className="whitespace-nowrap text-muted">{formatDate(p.createdAt)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Latest enquiries" pad={false} action={<Link href="/superadmin/inquiries" className="text-sm font-semibold text-teal-ink hover:text-ink">All enquiries</Link>}>
          {inquiries.length === 0 ? <EmptyState title="No enquiries yet" /> : (
            <ul className="divide-y divide-line">
              {inquiries.map((q) => (
                <li key={q._id}>
                  <Link href={`/superadmin/inquiries/${q._id}`} className="block px-5 py-3.5 hover:bg-paper sm:px-6">
                    <span className="flex items-center justify-between gap-3"><span className="font-semibold text-ink">{q.name}</span><StatusPill status={q.status} /></span>
                    <span className="mt-0.5 block truncate text-sm text-muted">{q.property.title} · {formatDate(q.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Open bid notices" pad={false} action={<Link href="/superadmin/bid-notices/create" className="text-sm font-semibold text-teal-ink hover:text-ink">New notice</Link>}>
          {notices.length === 0 ? <EmptyState title="No open bid notices" body="Create one to invite business partners to bid on lots." /> : (
            <ul className="divide-y divide-line">
              {notices.map((n) => (
                <li key={n._id}>
                  <Link href={`/superadmin/bid-notices/${n._id}`} className="block px-5 py-3.5 hover:bg-paper sm:px-6">
                    <span className="font-semibold text-ink">{n.transactionNumber} · {n.client}</span>
                    <span className="mt-0.5 block text-sm text-muted">{n.totalLots} lots · closes {formatDate(n.deadline)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  )
}
