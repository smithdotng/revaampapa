import type { Metadata } from 'next'
import Link from 'next/link'
import { Faq } from '@/components/Faq'
import { FAQ } from '@/lib/site'

export const metadata: Metadata = { title: 'How it works', description: 'How buyers, owners, promoters, hotels and Room Voucher subscribers use RevaampAPA.' }

type Track = { id: string; label: string; title: string; steps: [string, string][]; note?: React.ReactNode; cta: [string, string] }

const TRACKS: Track[] = [
  {
    id: 'buyers', label: 'Buyers & tenants', title: 'Find and secure a verified property',
    steps: [
      ['Search', 'Filter verified land, buildings, shops, shortlets and business complexes by type, state and price.'],
      ['Ask the owner', 'Send a question from any listing. The owner replies to your email; your details go nowhere else.'],
      ['Inspect and close', 'Arrange an inspection, check the documents and complete the deal with the owner.'],
    ],
    cta: ['Browse properties', '/properties'],
  },
  {
    id: 'owners', label: 'Property owners', title: 'List once, reach the whole network',
    steps: [
      ['Register free', 'Create an owner account in a couple of minutes.'],
      ['List and verify', 'Add photos, price and documents. Pay the ₦20,000 verification fee and our team checks the listing.'],
      ['Get enquiries', 'Your listing goes live to buyers and to promoters who share it. Track enquiries in your dashboard.'],
    ],
    cta: ['List your property', '/register'],
  },
  {
    id: 'promoters', label: 'Promoters', title: 'Share listings, earn on every introduction',
    steps: [
      ['Join free', 'Promoter accounts are approved instantly — no fee.'],
      ['Share your links', 'Your dashboard gives you referral links to share on WhatsApp and social media.'],
      ['Earn', 'Introduce a property: 40% of the agency fee. Introduce a buyer: 90% from the buyer plus 50% from the seller. Introduce a promoter: 70% residual income.'],
    ],
    note: 'Agency Scheme income carries a 10% administrative fee; other programme income carries 3.5%.',
    cta: ['Become a promoter — free', '/promoter/register'],
  },
  {
    id: 'hotels', label: 'Partner hotels', title: 'Get your rooms off-taken by Revaamp',
    steps: [
      ['Apply', 'Submit your hotel with photos, room types and rates. We verify your CAC registration and operating licence.'],
      ['Go live', 'Approved hotels are published to the Revaamp directory and marketed by promoters and business partners across Africa.'],
      ['Fill rooms', 'Revaamp off-takes your rooms and the network fills them. We keep you updated by email — there’s no account to manage.'],
    ],
    cta: ['List your hotel', '/partner-hotel/register'],
  },
  {
    id: 'voucher', label: 'Room Voucher', title: 'Stay at listed hotels, get cashback',
    steps: [
      ['Subscribe', 'We issue your membership number once your subscription is active.'],
      ['Register before you go', 'Choose a hotel, check its cashback rate and register your dates. A stay that wasn’t registered can’t be claimed later.'],
      ['Stay, then get paid', 'Book and pay the hotel as normal. After the stay is confirmed, we pay your discount back as cashback.'],
    ],
    cta: ['Subscribe to the Room Voucher', '/voucher/register'],
  },
]

export default function HowItWorks() {
  return (
    <>
      <section className="wrap pb-8 pt-12 md:pt-16">
        <h1 className="t-1 max-w-3xl">How Revaamp works</h1>
        <p className="lede mt-4">Pick the part that applies to you.</p>
        <nav aria-label="Sections" className="mt-8 flex flex-wrap gap-2">
          {TRACKS.map((t) => (
            <a key={t.id} href={`#${t.id}`} className="rounded-full border border-line-2 bg-white px-4 py-2 text-[0.95rem] font-medium text-ink-2 hover:border-ink hover:text-ink">{t.label}</a>
          ))}
        </nav>
      </section>
      {TRACKS.map((t, idx) => (
        <section key={t.id} id={t.id} className={`scroll-mt-20 border-t border-line ${idx % 2 ? 'bg-white' : ''}`} aria-labelledby={`${t.id}-t`}>
          <div className="wrap grid gap-10 py-16 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
            <div>
              <p className="text-sm font-semibold text-teal-ink">{t.label}</p>
              <h2 id={`${t.id}-t`} className="t-2 mt-2">{t.title}</h2>
              <Link href={t.cta[1]} className="btn btn-primary mt-6">{t.cta[0]}</Link>
            </div>
            <div>
              <ol className="grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-line bg-line md:grid-cols-3">
                {t.steps.map(([s, d], i) => (
                  <li key={s} className={`${idx % 2 ? 'bg-white' : 'bg-paper'} p-6`}>
                    <span className="font-display text-sm font-semibold text-roof">Step {i + 1}</span>
                    <h3 className="t-3 mt-2">{s}</h3>
                    <p className="mt-2 text-[0.95rem] text-ink-2">{d}</p>
                  </li>
                ))}
              </ol>
              {t.note && <p className="mt-5 text-sm text-muted">{t.note}</p>}
            </div>
          </div>
        </section>
      ))}
      <section id="faq" className="border-t border-line">
        <div className="wrap grid gap-10 py-20 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <h2 className="t-1">Common questions</h2>
          <Faq items={FAQ} />
        </div>
      </section>
    </>
  )
}
