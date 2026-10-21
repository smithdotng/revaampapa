import Link from 'next/link'
import { requireRole, plain, baseUrl } from '@/lib/guard'
import { Models } from '@/lib/legacy'
import { earnBase, shareMessage, type EarnRole } from '@/lib/earn'
import { naira, formatDate } from '@/lib/format'
import { DashHeader, Panel, EmptyState, Stat, StatGrid } from '@/components/dash/ui'
import { CopyLink } from '@/components/dash/client'

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function EarnPromotions({ role }: { role: EarnRole }) {
  const v = await requireRole(role)
  const promos = plain<any[]>(await Models.Promotion.find({ promoter: v.id }).populate('property', 'title slug price transactionType location status verificationStatus').sort('-createdAt').lean())
  const clicks = promos.reduce((s, p) => s + (p.clicks || 0), 0)
  const leads = promos.reduce((s, p) => s + (p.inquiries || 0), 0)
  return (
    <>
      <DashHeader title="My property links" intro="Each link is unique to you. Share it anywhere — WhatsApp status, Instagram bio, group chats."
        actions={<Link href={`${earnBase(role)}/properties`} className="btn btn-primary">Get another link</Link>} />
      <StatGrid cols={3}>
        <Stat label="Active links" value={promos.length} />
        <Stat label="Clicks" value={clicks.toLocaleString()} />
        <Stat label="Enquiries" value={leads.toLocaleString()} hint={clicks ? `${((leads / clicks) * 100).toFixed(1)}% of clicks` : undefined} />
      </StatGrid>
      <Panel className="mt-6" pad={false}>
        {promos.length === 0 ? (
          <EmptyState title="No links yet" body="Pick a verified property and we’ll create a tracked link for you." action={<Link href={`${earnBase(role)}/properties`} className="btn btn-primary">Browse properties</Link>} />
        ) : (
          <ul className="divide-y divide-line">
            {promos.map((p) => {
              const live = p.property && p.property.verificationStatus === 'verified' && p.property.status === 'available'
              return (
                <li key={p._id} className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[1fr_auto_minmax(320px,420px)] lg:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{p.property?.title || 'Property removed'}</p>
                    <p className="text-sm text-muted">{p.property ? naira(p.property.price) : ''}. Created {formatDate(p.createdAt)}{!live && p.property ? '. No longer available' : ''}</p>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <span><strong className="font-display text-lg">{p.clicks || 0}</strong> <span className="text-muted">clicks</span></span>
                    <span><strong className="font-display text-lg">{p.inquiries || 0}</strong> <span className="text-muted">leads</span></span>
                  </div>
                  {live ? <CopyLink compact url={`${baseUrl()}/r/${p.referralCode}`} message={shareMessage(p.property)} track={{ propertyId: p.property._id, linkType: 'property' }} /> : <span className="text-sm text-muted">Link paused</span>}
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </>
  )
}
