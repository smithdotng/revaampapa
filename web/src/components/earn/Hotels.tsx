import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole, plain, baseUrl } from '@/lib/guard'
import { Models } from '@/lib/legacy'
import { earnBase, type EarnRole } from '@/lib/earn'
import { naira, place, formatDate } from '@/lib/format'
import { DashHeader, Panel, EmptyState, Stat, StatGrid, Table } from '@/components/dash/ui'
import { SmartImage } from '@/components/SmartImage'
import { HotelLinkButton } from './HotelLinkButton'

/* eslint-disable @typescript-eslint/no-explicit-any */
const profileKey = (r: EarnRole) => (r === 'business_partner' ? 'businessPartnerProfile' : 'promoterProfile')
const msg = (h: any) => `🏨 ${h.name}${h.location?.city ? `, ${h.location.city}` : ''}${h.voucherDiscountRate ? `\nRoom Voucher members get ${h.voucherDiscountRate}% cashback.` : ''}\n\nSee rooms and contact the hotel:`

function myLinks(doc: any, role: EarnRole) {
  // Older partner links were stored under promoterProfile, so read both
  const all = [...(doc[profileKey(role)]?.uniqueLinks || []), ...(role === 'business_partner' ? doc.promoterProfile?.uniqueLinks || [] : [])]
  return new Map<string, string>(all.filter((l: any) => l.hotelId).map((l: any) => [String(l.hotelId), l.code]))
}

export async function EarnHotels({ role }: { role: EarnRole }) {
  const v = await requireRole(role)
  const me = v.doc._id
  const mine = role === 'business_partner' ? { $or: [{ promoter: me }, { businessPartner: me }] } : { promoter: me }
  const [hotels, byHotel] = await Promise.all([
    Models.Hotel.find({ isActive: true }).select('name slug images location voucherDiscountRate commissionRate featured').sort({ featured: -1, createdAt: -1 }).lean(),
    Models.HotelClick.find(mine).select('hotel converted commissionEarned').lean(),
  ])
  const stats = new Map<string, any>()
  for (const c of byHotel as any[]) {
    const k = String(c.hotel)
    const s = stats.get(k) || { clicks: 0, conversions: 0, earned: 0 }
    s.clicks++; if (c.converted) s.conversions++; s.earned += c.commissionEarned || 0
    stats.set(k, s)
  }
  const links = myLinks(v.doc, role)
  const totals = [...stats.values()].reduce((t: any, x: any) => ({ clicks: t.clicks + x.clicks, conversions: t.conversions + x.conversions, earned: t.earned + x.earned }), { clicks: 0, conversions: 0, earned: 0 })
  const list = plain<any[]>(hotels)
  return (
    <>
      <DashHeader title="Hotel promotions" intro="Share a hotel with your link. Clicks and bookings through it are credited to you." />
      <StatGrid cols={3}>
        <Stat label="Clicks" value={totals.clicks} />
        <Stat label="Bookings" value={totals.conversions} />
        <Stat label="Hotel commission earned" value={naira(totals.earned)} accent />
      </StatGrid>
      {list.length === 0 ? (
        <Panel className="mt-6"><EmptyState title="No partner hotels listed yet" body="Know a hotel that should be here? Use your hotel onboarding link on the Overview page." /></Panel>
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((h) => {
            const s = stats.get(String(h._id))
            const code = links.get(String(h._id))
            const img = (h.images || []).find((i: any) => i.isPrimary)?.url || h.images?.[0]?.url
            return (
              <li key={h._id} className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-white">
                <div className="relative aspect-[16/10] bg-mist"><SmartImage src={img} alt={h.name} sizes="360px" /></div>
                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div>
                    <Link href={`${earnBase(role)}/hotels/${h._id}`} className="font-semibold hover:underline">{h.name}</Link>
                    <p className="text-sm text-muted">{place(h.location)}</p>
                    <p className="mt-2 text-sm text-ink-2">{s?.clicks || 0} clicks / {s?.conversions || 0} bookings</p>
                  </div>
                  <div className="mt-auto"><HotelLinkButton hotelId={h._id} existing={code ? `${baseUrl()}/hotels/track/${h._id}/${code}` : undefined} message={msg(h)} compact /></div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

export async function EarnHotelDetail({ role, id }: { role: EarnRole; id: string }) {
  const v = await requireRole(role)
  const h: any = plain(await Models.Hotel.findOne({ _id: id, isActive: true }).lean().catch(() => null))
  if (!h) notFound()
  const me = v.doc._id
  const mine = role === 'business_partner' ? { hotel: h._id, $or: [{ promoter: me }, { businessPartner: me }] } : { hotel: h._id, promoter: me }
  const clicks = plain<any[]>(await Models.HotelClick.find(mine).sort('-clickedAt').limit(50).lean())
  const code = myLinks(v.doc, role).get(String(h._id))
  return (
    <>
      <DashHeader back={{ label: 'All hotels', href: `${earnBase(role)}/hotels` }} title={h.name} intro={place(h.location)}
        actions={<a href={`/hotels/${h.slug}`} target="_blank" className="btn btn-ghost">View public page</a>} />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Panel title="Your link for this hotel"><HotelLinkButton hotelId={h._id} existing={code ? `${baseUrl()}/hotels/track/${h._id}/${code}` : undefined} message={msg(h)} /></Panel>
        <StatGrid cols={2}>
          <Stat label="Clicks" value={clicks.length} />
          <Stat label="Bookings" value={clicks.filter((c) => c.converted).length} />
          <Stat label="Room Voucher cashback" value={h.voucherDiscountRate ? `${h.voucherDiscountRate}%` : '—'} />
          <Stat label="Earned here" value={naira(clicks.reduce((s, c) => s + (c.commissionEarned || 0), 0))} />
        </StatGrid>
      </div>
      <Panel className="mt-6" title="Recent clicks" pad={false}>
        {clicks.length ? (
          <Table head={['When', 'From', 'Booked']}>
            {clicks.map((c) => (
              <tr key={c._id}><td>{formatDate(c.clickedAt)}</td><td className="max-w-[320px] truncate text-muted">{c.referrer || 'Direct / app'}</td><td>{c.converted ? 'Yes' : '—'}</td></tr>
            ))}
          </Table>
        ) : <EmptyState title="No clicks yet" body="Share your link to start tracking." />}
      </Panel>
    </>
  )
}
