import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getHomeData, getPropertyStates, getFeaturedHotels } from '@/lib/data'
import { FAQ } from '@/lib/site'
import { HeroChooser } from '@/components/HeroChooser'
import { PropertySearch } from '@/components/PropertySearch'
import { PropertyCard } from '@/components/PropertyCard'
import { HotelCard } from '@/components/HotelCard'
import { RolesIndex } from '@/components/RolesIndex'
import { Faq } from '@/components/Faq'
import { SmartImage } from '@/components/SmartImage'

export const dynamic = 'force-dynamic'

const STEPS = [
  ['Choose your role', 'Join as a property owner, promoter, subscriber, partner or professional. Promoters join free.'],
  ['Get verified', 'Our team reviews your account, and every property is checked before it is published.'],
  ['Take action', 'List, share your links, register hotel stays or start your build — all from your dashboard.'],
  ['Get paid', 'Commissions, cashback and fees are tracked against your account and paid out as deals close.'],
]

export default async function Home() {
  const [{ latest, stats }, states, hotels] = await Promise.all([getHomeData(), getPropertyStates(), getFeaturedHotels(3)])

  return (
    <>
      <section className="wrap pb-20 pt-10 md:pt-14 lg:pb-24">
        <HeroChooser stats={stats} />
      </section>

      <section aria-labelledby="search-title" className="wrap -mt-2 pb-20">
        <h2 id="search-title" className="sr-only">Search properties</h2>
        <PropertySearch states={states} />
      </section>

      <section aria-labelledby="latest-title" className="wrap pb-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="latest-title" className="t-1">Newly verified</h2>
            <p className="mt-2 text-ink-2">Checked by our team and open for enquiries today.</p>
          </div>
          <Link href="/properties" className="btn btn-ghost">
            All properties <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        {latest.length ? (
          <div className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((p, i) => <PropertyCard key={p.id} p={p} priority={i < 3} />)}
          </div>
        ) : (
          <div className="mt-10 rounded-[var(--radius-lg)] border border-dashed border-line-2 p-10 text-center">
            <p className="t-3">New listings are being verified</p>
            <p className="mt-2 text-ink-2">Own property? List it now and it could be first on this page.</p>
            <Link href="/register" className="btn btn-primary mt-6">List your property</Link>
          </div>
        )}
      </section>

      <section aria-labelledby="roles-title" className="border-t border-line bg-white">
        <div className="wrap grid gap-12 py-24 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <h2 id="roles-title" className="t-1">Nine ways to work with Revaamp</h2>
            <p className="mt-4 text-ink-2">
              Each role has its own dashboard and income. Open one to see exactly what you get and what it costs.
            </p>
            <Link href="/join" className="link mt-6 inline-block font-medium">Compare every role side by side</Link>
          </div>
          <RolesIndex />
        </div>
      </section>

      <section aria-labelledby="hotels-title" className="bg-lagoon text-white">
        <div className="wrap grid gap-14 py-24 lg:grid-cols-2 lg:gap-20">
          <div>
            <h2 id="hotels-title" className="t-1 text-white">Stay at partner hotels. Get money back.</h2>
            <p className="mt-5 max-w-xl text-lg text-white/75">
              Room Voucher subscribers get a discount at every hotel in the Revaamp directory, paid back as cashback after the stay.
            </p>
            <ol className="mt-10 grid gap-6">
              {[
                ['Subscribe', 'We issue your membership number. It identifies you at every listed hotel.'],
                ['Register the stay before check-in', 'Pick a hotel, check its cashback rate, register your dates. This step is the claim.'],
                ['Stay, then get paid', 'Book and pay the hotel as normal. Once the stay is confirmed, we pay your cashback.'],
              ].map(([t, d], i) => (
                <li key={t} className="grid grid-cols-[2.5rem_1fr] gap-4">
                  <span className="grid size-10 place-items-center rounded-full border border-white/25 font-display text-lg font-semibold">{i + 1}</span>
                  <div>
                    <h3 className="font-sans text-lg font-semibold tracking-normal text-white">{t}</h3>
                    <p className="mt-1 text-white/70">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/voucher/register" className="btn btn-light">Subscribe to the Room Voucher</Link>
              <Link href="/partner-hotel/register" className="btn btn-ghost-light">List your hotel</Link>
            </div>
          </div>

          <div>
            {hotels.length ? (
              <div className="grid gap-4">
                {hotels.map((h) => (
                  <Link key={h.id} href={`/hotels/${h.slug}`} className="group flex items-center gap-5 rounded-[var(--radius-md)] bg-lagoon-2 p-3 pr-5 transition-colors hover:bg-lagoon-3">
                    <div className="relative size-24 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-lagoon-3">
                      <SmartImage src={h.image} alt="" sizes="96px" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-semibold">{h.name}</p>
                      <p className="text-sm text-white/65">{[h.location.city, h.location.state].filter(Boolean).join(', ')}</p>
                    </div>
                    {h.voucherDiscountRate > 0 && (
                      <p className="text-right">
                        <span className="block font-display text-2xl font-semibold">{h.voucherDiscountRate}%</span>
                        <span className="text-xs text-white/60">cashback</span>
                      </p>
                    )}
                  </Link>
                ))}
                <Link href="/hotels" className="mt-2 inline-flex items-center gap-2 font-medium text-white hover:underline">
                  Browse all partner hotels <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            ) : (
              <div className="rounded-[var(--radius-lg)] border border-white/15 p-8">
                <h3 className="t-2 text-white">Own a hotel?</h3>
                <p className="mt-3 text-white/75">
                  List with Revaamp and get your rooms off-taken by Revaamp, marketed by promoters and partners across Africa.
                </p>
                <Link href="/partner-hotel/register" className="btn btn-light mt-6">Become a partner hotel</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="how-title" className="wrap py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="how-title" className="t-1 max-w-xl">From sign-up to payout</h2>
          <Link href="/how-it-works" className="btn btn-ghost">How it works</Link>
        </div>
        <ol className="mt-12 grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="bg-paper p-7">
              <span className="font-display text-sm font-semibold text-roof">Step {i + 1}</span>
              <h3 className="t-3 mt-3">{t}</h3>
              <p className="mt-2 text-[0.95rem] text-ink-2">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="faq-title" className="border-t border-line bg-white">
        <div className="wrap grid gap-10 py-24 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <div>
            <h2 id="faq-title" className="t-1">Questions people ask first</h2>
            <p className="mt-4 text-ink-2">
              Something else? <Link href="/contact" className="link">Send us a message</Link>.
            </p>
          </div>
          <Faq items={FAQ} />
        </div>
      </section>

      <section className="wrap py-20">
        <div className="relative overflow-hidden rounded-[var(--radius-xl)] bg-ink px-8 py-14 text-white md:px-14 md:py-16">
          <div className="relative max-w-2xl">
            <h2 className="t-1 text-white">Start earning this week</h2>
            <p className="mt-4 text-lg text-white/75">
              A promoter account is free and takes two minutes. Share your first listing today.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/promoter/register" className="btn btn-light">Become a promoter — free</Link>
              <Link href="/join" className="btn btn-ghost-light">See all nine roles</Link>
            </div>
          </div>
          <svg viewBox="0 0 40 26" aria-hidden className="absolute -bottom-10 -right-10 w-[420px] opacity-[0.12] max-md:hidden">
            <path d="M0 26 L20 0 L26 8 L10 26 Z" fill="#f58632" />
            <path d="M20 0 L40 26 L30 26 L26 8 Z" fill="#ffffff" />
          </svg>
        </div>
      </section>
    </>
  )
}
