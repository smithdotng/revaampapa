import type { Metadata } from 'next'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { Models } from '@/lib/legacy'
import { requireAdmin, qs, PENDING } from '@/lib/admin'
import { plain } from '@/lib/guard'
import { formatDate, place, mediaUrl, AMENITIES } from '@/lib/format'
import { DashHeader, Panel, EmptyState, StatusPill, Tabs } from '@/components/dash/ui'
import { Actions, QueueItem, Facts, DocLink } from '@/components/admin/ui'
import { Act } from '@/components/admin/Act'
import { approvePartnerHotel, rejectPartnerHotel, togglePartnerHotelFeatured } from '@/actions/admin'

export const metadata: Metadata = { title: 'Partner hotels' }

/* eslint-disable @typescript-eslint/no-explicit-any */
type SP = { status?: string }

const STATUS: Record<string, object> = {
  pending: PENDING.partnerHotel,
  active: { 'partnerProfile.isActive': true },
  declined: { isSuspended: true },
}

export default async function PartnerHotels({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin()
  const sp = await searchParams
  const status = sp.status ?? 'pending'
  const [items, all, pending, active, declined] = await Promise.all([
    Models.PartnerHotel.find(STATUS[status] || {}).select('-password').populate('partnerProfile.onboardedByPromoter', 'name email userType').populate('partnerProfile.listing', 'slug name').sort('-createdAt').limit(100).lean(),
    Models.PartnerHotel.countDocuments(),
    ...['pending', 'active', 'declined'].map((s) => Models.PartnerHotel.countDocuments(STATUS[s])),
  ])
  const list = plain<any[]>(items)
  const tab = (s: string) => `/superadmin/partner-hotels${qs({ status: s })}`

  return (
    <>
      <DashHeader title="Partner hotels" intro="Hotels that apply to be marketed by the Revaamp network. Approving one publishes its listing for every promoter to share." />
      <Tabs items={[
        { label: 'To review', href: tab('pending'), active: status === 'pending', count: pending },
        { label: 'Live', href: tab('active'), active: status === 'active', count: active },
        { label: 'Declined', href: tab('declined'), active: status === 'declined', count: declined },
        { label: 'All', href: tab('all'), active: status === 'all', count: all },
      ]} />
      <Panel pad={false}>
        {list.length === 0 ? <EmptyState title={status === 'pending' ? 'No applications to review' : 'No hotels here'} /> : (
          <ul className="divide-y divide-line">
            {list.map((h) => {
              const pp = h.partnerProfile || {}
              const s = pp.isActive ? 'active' : h.isSuspended ? 'rejected' : 'pending'
              const cover = (h.images || []).find((i: any) => i.isPrimary) || h.images?.[0]
              return (
                <QueueItem key={h._id} title={h.hotelName}
                  aside={<><StatusPill status={s} label={s === 'rejected' ? 'Declined' : s === 'active' ? 'Live' : undefined} />{pp.placementTier === 'featured' && <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#a24d0e]"><Star className="size-3.5 fill-roof text-roof" /> Featured</span>}</>}
                  meta={`${place(h.location)} · ${h.starRating ? `${h.starRating}★ · ` : ''}${h.numberOfRooms ? `${h.numberOfRooms} rooms · ` : ''}applied ${formatDate(h.createdAt)}`}
                  actions={
                    <Actions>
                      {s !== 'active' && <Act action={approvePartnerHotel} id={h._id} variant="ok" label="Approve and publish" />}
                      {s !== 'rejected' && <Act action={rejectPartnerHotel} id={h._id} variant="danger" label={s === 'active' ? 'Take down' : 'Decline'} ask={[{ name: 'reason', label: 'Reason', type: 'textarea' }]} submitLabel={s === 'active' ? 'Take down' : 'Decline'} />}
                      {s === 'active' && <Act action={togglePartnerHotelFeatured} id={h._id} label={pp.placementTier === 'featured' ? 'Make standard' : 'Make featured'} />}
                      {pp.listing?.slug && <Link href={`/hotels/${pp.listing.slug}`} target="_blank" className="btn btn-ghost min-h-10 px-4 text-sm">View listing</Link>}
                    </Actions>
                  }>
                  <div className="flex gap-4">
                    {cover && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaUrl(cover.url)} alt="" className="hidden h-20 w-28 shrink-0 rounded-[var(--radius-sm)] object-cover sm:block" loading="lazy" />
                    )}
                    <div className="min-w-0 flex-1">
                      <Facts items={[
                        ['Contact', `${h.name}${h.position ? `, ${h.position}` : ''}`],
                        ['Email', h.email],
                        ['Phone', h.phone],
                        ['Commission', pp.commissionRate ? `${pp.commissionRate}%` : undefined],
                        ['Onboarded by', pp.onboardedByPromoter ? `${pp.onboardedByPromoter.name} (${pp.onboardedByPromoter.userType?.replace('_', ' ')})` : undefined],
                        ['Amenities', (h.amenities || []).map((a: string) => AMENITIES[a] || a).join(', ')],
                      ]} />
                      <div className="mt-2 flex flex-wrap gap-4">
                        {h.cacCertificate?.url && <DocLink url={h.cacCertificate.url} label="CAC certificate" />}
                        {h.hotelLicence?.url && <DocLink url={h.hotelLicence.url} label="Hotel licence" />}
                        {h.ratePolicy?.url && <DocLink url={h.ratePolicy.url} label="Rate policy" />}
                      </div>
                    </div>
                  </div>
                </QueueItem>
              )
            })}
          </ul>
        )}
      </Panel>
    </>
  )
}
