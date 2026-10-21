import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { MapPin, Eye, ShieldCheck } from 'lucide-react'
import { getProperty, getSimilarProperties, countPropertyView, recordPromotionClick } from '@/lib/data'
import { getCurrentUser } from '@/lib/session'
import { naira, place, stripHtml, PROPERTY_TYPES, TRANSACTION_TYPES } from '@/lib/format'
import { cleanHtml } from '@/lib/sanitize'
import { SITE } from '@/lib/site'
import { Gallery } from '@/components/Gallery'
import { ShareBar } from '@/components/ShareBar'
import { PropertyCard } from '@/components/PropertyCard'
import { InquiryForm } from './InquiryForm'

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const p = await getProperty((await params).slug)
  if (!p) return { title: 'Property not found' }
  const description = stripHtml(p.description).slice(0, 160)
  // The first image is the share image, as on the Express site
  const image = p.images[0]?.url
  return {
    title: `${p.title} — ${naira(p.price)}`,
    description,
    alternates: { canonical: `/properties/${p.slug}` },
    openGraph: { title: p.title, description, images: image ? [{ url: image }] : undefined, type: 'article' },
  }
}

const FEATURE_LABELS: [string, string, (v: number) => string][] = [
  ['bedrooms', 'Bedrooms', String],
  ['bathrooms', 'Bathrooms', String],
  ['toilets', 'Toilets', String],
  ['parkingSpaces', 'Parking', (v) => `${v} space${v === 1 ? '' : 's'}`],
  ['floorArea', 'Floor area', (v) => `${v.toLocaleString()} m²`],
  ['landArea', 'Land area', (v) => `${v.toLocaleString()} m²`],
]
const AMENITY_FLAGS: [string, string][] = [
  ['furnished', 'Furnished'],
  ['serviced', 'Serviced'],
  ['security', '24-hour security'],
  ['powerSupply', 'Steady power'],
  ['borehole', 'Borehole'],
]

export default async function PropertyPage({ params, searchParams }: { params: Params; searchParams: Promise<{ ref?: string }> }) {
  const { slug } = await params
  const { ref } = await searchParams
  const p = await getProperty(slug)
  if (!p) notFound()
  void countPropertyView(p.id)
  if (ref) void recordPromotionClick(ref, p.id)

  const [similar, user, h] = await Promise.all([getSimilarProperties(p), getCurrentUser(), headers()])
  const host = h.get('x-forwarded-host') || h.get('host')
  const proto = h.get('x-forwarded-proto') || 'https'
  const url = host ? `${proto}://${host}/properties/${p.slug}` : `${SITE.url}/properties/${p.slug}`

  const f = (p.features || {}) as Record<string, number | boolean | undefined>
  const facts = FEATURE_LABELS.filter(([k]) => typeof f[k] === 'number' && (f[k] as number) > 0).map(([k, l, fmt]) => [l, fmt(f[k] as number)])
  const flags = AMENITY_FLAGS.filter(([k]) => f[k] === true).map(([, l]) => l)
  const sd = p.shortletDetails

  return (
    <>
      <div className="wrap pt-6">
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href="/properties" className="hover:text-ink">Properties</Link></li>
            {p.location.state && (<><li aria-hidden>/</li><li><Link href={`/properties?state=${encodeURIComponent(p.location.state)}`} className="hover:text-ink">{p.location.state}</Link></li></>)}
            <li aria-hidden>/</li>
            <li aria-current="page" className="max-w-[40ch] truncate text-ink-2">{p.title}</li>
          </ol>
        </nav>
      </div>

      <div className="wrap grid grid-cols-1 gap-10 pb-20 pt-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-14">
        <div className="min-w-0">
          <Gallery images={p.images} title={p.title} />

          <header className="mt-8">
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-ink px-3 py-1 font-semibold text-white">{TRANSACTION_TYPES[p.transactionType] || p.transactionType}</span>
              <span className="rounded-full bg-mist px-3 py-1 font-semibold text-lagoon">{PROPERTY_TYPES[p.propertyType] || p.propertyType}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-soft px-3 py-1 font-semibold text-ok"><ShieldCheck className="size-4" aria-hidden /> Verified by Revaamp</span>
            </div>
            <h1 className="t-1 mt-5">{p.title}</h1>
            <p className="mt-3 flex items-center gap-2 text-ink-2">
              <MapPin className="size-5 shrink-0 text-muted" aria-hidden />
              {[p.location.address, p.location.lga, place(p.location)].filter(Boolean).join(', ') || 'Nigeria'}
            </p>
            {p.location.landmark && <p className="mt-1 pl-7 text-sm text-muted">Near {p.location.landmark}</p>}
          </header>

          {facts.length > 0 && (
            <dl className="mt-8 grid grid-cols-2 overflow-hidden rounded-[var(--radius-md)] border border-line bg-white sm:grid-cols-3 [&>div]:border-b [&>div]:border-r [&>div]:border-line">
              {facts.map(([l, v]) => (
                <div key={l} className="bg-white p-4">
                  <dt className="text-sm text-muted">{l}</dt>
                  <dd className="mt-0.5 font-display text-xl font-semibold tracking-tight">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          <section className="mt-12" aria-labelledby="about-title">
            <h2 id="about-title" className="t-2">About this property</h2>
            <div className="prose-rv mt-5" dangerouslySetInnerHTML={{ __html: cleanHtml(p.description) }} />
          </section>

          {flags.length > 0 && (
            <section className="mt-12" aria-labelledby="features-title">
              <h2 id="features-title" className="t-2">Features</h2>
              <ul className="mt-5 flex flex-wrap gap-2">
                {flags.map((x) => <li key={x} className="rounded-full border border-line-2 bg-white px-4 py-2 text-sm font-medium">{x}</li>)}
              </ul>
            </section>
          )}

          {sd && (
            <section className="mt-12" aria-labelledby="stay-title">
              <h2 id="stay-title" className="t-2">Stay details</h2>
              <dl className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {[
                  ['Check-in', sd.checkInTime],
                  ['Check-out', sd.checkOutTime],
                  ['Guests', sd.maxGuests],
                  ['Minimum stay', sd.minimumStay ? `${sd.minimumStay} night${sd.minimumStay > 1 ? 's' : ''}` : null],
                  ['Cleaning fee', sd.cleaningFee ? naira(sd.cleaningFee) : null],
                  ['Security deposit', sd.securityDeposit ? naira(sd.securityDeposit) : null],
                ].filter(([, v]) => v).map(([l, v]) => (
                  <div key={l as string} className="flex justify-between border-b border-line py-2"><dt className="text-muted">{l}</dt><dd className="font-medium">{v as string}</dd></div>
                ))}
              </dl>
            </section>
          )}

          {p.videoUrl && (
            <p className="mt-10"><a href={p.videoUrl} target="_blank" rel="noopener noreferrer" className="link font-medium">Watch the video tour</a></p>
          )}

          <section className="mt-12 border-t border-line pt-8" aria-label="Share">
            <p className="mb-3 font-medium">Share this listing</p>
            <ShareBar url={url} title={p.title} />
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div id="ask" className="scroll-mt-24 rounded-[var(--radius-lg)] border border-line bg-white p-6">
            <p className="text-sm text-muted">{p.transactionType === 'sale' ? 'Asking price' : p.propertyType === 'shortlet' ? 'Per night' : 'Price'}</p>
            <p className="font-display text-4xl font-semibold tracking-tight">{naira(p.price)}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted">
              {p.priceNegotiable && <span className="font-medium text-ok">Negotiable</span>}
              <span className="inline-flex items-center gap-1"><Eye className="size-4" aria-hidden /> {p.views.toLocaleString()} {p.views === 1 ? "view" : "views"}</span>
            </p>
            <hr className="my-6 border-line" />
            <h2 className="t-3">Ask the owner</h2>
            <p className="mb-5 mt-1 text-sm text-muted">Questions about price, documents or inspection.</p>
            <InquiryForm propertyId={p.id} title={p.title} user={user ? { name: user.name, email: user.email } : null} refCode={ref} />
          </div>
          <div className="mt-4 rounded-[var(--radius-lg)] bg-mist p-6">
            <p className="font-semibold text-lagoon">Know someone looking?</p>
            <p className="mt-1 text-sm text-ink-2">Promoters earn up to 90% of the buyer’s agency fee for introducing a buyer.</p>
            <Link href="/promoter/register" className="link mt-3 inline-block text-sm font-semibold">Become a promoter — free</Link>
          </div>
        </aside>
      </div>

      {/* Mobile: keep the price and the main action in reach */}
      <div aria-hidden className="h-16 lg:hidden" />
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t border-line bg-white/95 px-5 py-3 backdrop-blur lg:hidden">
        <p className="font-display text-xl font-semibold tracking-tight">{naira(p.price)}</p>
        <a href="#ask" className="btn btn-primary min-h-11">Message the owner</a>
      </div>

      {similar.length > 0 && (
        <section className="border-t border-line bg-white" aria-labelledby="similar-title">
          <div className="wrap py-20">
            <h2 id="similar-title" className="t-1">Similar properties</h2>
            <div className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((s) => <PropertyCard key={s.id} p={s} />)}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
