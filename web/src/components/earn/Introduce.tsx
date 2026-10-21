import { requireRole, plain } from '@/lib/guard'
import { Models } from '@/lib/legacy'
import { earnBase, referralLinks, type EarnRole } from '@/lib/earn'
import { formatDate } from '@/lib/format'
import { DashHeader, Tabs, Panel, StatusPill, EmptyState } from '@/components/dash/ui'
import { CopyLink } from '@/components/dash/client'
import { IntroducePropertyForm, IntroduceBuyerForm, IntroduceHotelForm } from './IntroduceForms'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Kind = 'property' | 'buyer' | 'hotel'

const COPY: Record<Kind, { title: string; intro: string; earn: string }> = {
  property: { title: 'Introduce a property', intro: 'Know an owner who wants to sell? Tell us and we’ll handle verification and listing.', earn: 'You earn 40% of the agency fee when it sells.' },
  buyer: { title: 'Introduce a buyer', intro: 'Know someone looking to buy or rent? We’ll match them with verified properties.', earn: 'You earn 90% of the agency fee from the buyer, plus 50% from the seller.' },
  hotel: { title: 'Introduce a hotel', intro: 'Our team contacts the hotel and takes them through partnership.', earn: 'You earn 30% of the commission the hotel pays Revaamp.' },
}

export async function EarnIntroduce({ role, kind }: { role: EarnRole; kind: Kind }) {
  const v = await requireRole(role)
  const base = earnBase(role)
  const me = v.doc._id
  const [props, history, links] = await Promise.all([
    kind === 'buyer' ? Models.Property.find({ verificationStatus: 'verified', status: 'available' }).select('title').sort('-createdAt').limit(200).lean() : [],
    kind === 'property' ? Models.PropertyIntroduction.find({ promoter: me }).sort('-createdAt').limit(20).lean()
      : kind === 'buyer' ? Models.BuyerIntroduction.find({ promoter: me }).sort('-createdAt').limit(20).lean()
      : Models.HotelPartner.find({ promoter: me }).sort('-createdAt').limit(20).lean(),
    kind === 'hotel' ? referralLinks(v) : null,
  ])
  const c = COPY[kind]
  return (
    <>
      <DashHeader title="Introduce" intro="Earn by connecting the people you know to Revaamp." />
      <Tabs items={[
        { label: 'A property', href: `${base}/submit-property`, active: kind === 'property' },
        { label: 'A buyer', href: `${base}/submit-buyer`, active: kind === 'buyer' },
        { label: 'A hotel', href: `${base}/onboard-hotel`, active: kind === 'hotel' },
      ]} />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="grid content-start gap-4">
          <div>
            <h2 className="t-2">{c.title}</h2>
            <p className="mt-1 text-ink-2">{c.intro}</p>
            <p className="mt-2 inline-block rounded-full bg-mist px-3 py-1 text-sm font-semibold text-lagoon">{c.earn}</p>
          </div>
          {kind === 'property' && <IntroducePropertyForm />}
          {kind === 'buyer' && <IntroduceBuyerForm properties={plain<any[]>(props).map((p) => [p._id, p.title])} />}
          {kind === 'hotel' && (
            <>
              {links && (
                <Panel title="Or send the hotel your link" intro="They apply themselves and you’re credited automatically.">
                  <CopyLink url={links.hotel} message="List your hotel on RevaampAPA and get your rooms off-taken by Revaamp:" track={{ linkType: 'hotel' }} />
                </Panel>
              )}
              <IntroduceHotelForm />
            </>
          )}
        </div>
        <Panel title="Your introductions" pad={false}>
          {history.length ? (
            <ul className="divide-y divide-line">
              {plain<any[]>(history).map((h) => (
                <li key={h._id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{h.title || h.buyer?.name || h.name}</p>
                    <p className="text-xs text-muted">{formatDate(h.createdAt)}</p>
                  </div>
                  <StatusPill status={h.status} />
                </li>
              ))}
            </ul>
          ) : <EmptyState title="None yet" body="What you submit shows here with its status." />}
        </Panel>
      </div>
    </>
  )
}
