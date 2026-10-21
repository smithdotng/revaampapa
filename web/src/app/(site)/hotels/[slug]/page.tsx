import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MapPin, Star, Phone, Mail, Globe, Check } from 'lucide-react'
import { getHotel } from '@/lib/data'
import { getSession } from '@/lib/session'
import { place, stripHtml, AMENITIES } from '@/lib/format'
import { cleanHtml } from '@/lib/sanitize'
import { Gallery } from '@/components/Gallery'

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const h = await getHotel((await params).slug)
  if (!h) return { title: 'Hotel not found' }
  const description = stripHtml(h.description).slice(0, 160)
  return { title: h.name, description, openGraph: { title: h.name, description, images: h.images[0] ? [{ url: h.images[0].url }] : undefined } }
}

export default async function HotelPage({ params }: { params: Params }) {
  const { slug } = await params
  const [h, session] = await Promise.all([getHotel(slug), getSession()])
  if (!h) notFound()
  const subscriber = !!session?.data.voucherMode || session?.data.userType === 'voucher_subscriber'
  const rate = h.voucherDiscountRate

  return (
    <>
      <div className="wrap pt-6">
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <ol className="flex gap-2"><li><Link href="/hotels" className="hover:text-ink">Hotels</Link></li><li aria-hidden>/</li><li aria-current="page" className="text-ink-2">{h.name}</li></ol>
        </nav>
      </div>
      <div className="wrap grid grid-cols-1 gap-10 pb-24 pt-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-14">
        <div className="min-w-0">
          <Gallery images={h.images} title={h.name} />
          <header className="mt-8">
            <h1 className="t-1">{h.name}</h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-2">
              <span className="flex items-center gap-1.5"><MapPin className="size-5 text-muted" aria-hidden />{[h.location.address, place(h.location)].filter(Boolean).join(', ') || h.location.country}</span>
              {h.rating > 0 && <span className="flex items-center gap-1.5"><Star className="size-5 fill-roof text-roof" aria-hidden />{h.rating.toFixed(1)} rating</span>}
            </p>
          </header>
          <section className="mt-10" aria-labelledby="about-h">
            <h2 id="about-h" className="t-2">About the hotel</h2>
            <div className="prose-rv mt-5" dangerouslySetInnerHTML={{ __html: cleanHtml(h.description) }} />
          </section>
          {h.amenities.length > 0 && (
            <section className="mt-12" aria-labelledby="amen-h">
              <h2 id="amen-h" className="t-2">Amenities</h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {h.amenities.map((a) => (
                  <li key={a} className="flex items-center gap-3 text-ink-2"><Check className="size-5 text-teal-ink" aria-hidden />{AMENITIES[a] || a}</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="grid gap-4 lg:sticky lg:top-24 lg:self-start">
          {rate > 0 && (
            <div className="rounded-[var(--radius-lg)] bg-lagoon p-6 text-white">
              <p className="text-sm text-white/65">Room Voucher cashback</p>
              <p className="font-display text-5xl font-semibold tracking-tight">{rate}%</p>
              <p className="mt-2 text-white/75">of your room cost, paid back after a stay you register before check-in.</p>
              {subscriber ? (
                <Link href={`/voucher/reserve/${h.slug}`} className="btn btn-light mt-6 w-full">Register my stay</Link>
              ) : (
                <div className="mt-6 grid gap-2">
                  <Link href="/voucher/register" className="btn btn-light w-full">Subscribe to claim cashback</Link>
                  <Link href="/hotels" className="btn btn-ghost-light w-full">I’m already a subscriber</Link>
                </div>
              )}
            </div>
          )}
          <div className="rounded-[var(--radius-lg)] border border-line bg-white p-6">
            <h2 className="t-3">Book with the hotel</h2>
            <p className="mt-1 text-sm text-muted">Revaamp doesn’t charge booking fees. Contact the hotel directly.</p>
            <ul className="mt-5 grid gap-3 text-[0.95rem]">
              {h.contactInfo.phone && <li><a href={`tel:${h.contactInfo.phone.replace(/\s/g, '')}`} className="flex items-center gap-3 hover:text-teal-ink"><Phone className="size-5 text-muted" aria-hidden />{h.contactInfo.phone}</a></li>}
              {h.contactInfo.email && <li><a href={`mailto:${h.contactInfo.email}`} className="flex items-center gap-3 break-all hover:text-teal-ink"><Mail className="size-5 shrink-0 text-muted" aria-hidden />{h.contactInfo.email}</a></li>}
              {h.contactInfo.website && <li><a href={h.contactInfo.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 break-all hover:text-teal-ink"><Globe className="size-5 shrink-0 text-muted" aria-hidden />{h.contactInfo.website.replace(/^https?:\/\//, '')}</a></li>}
              {!h.contactInfo.phone && !h.contactInfo.email && !h.contactInfo.website && <li className="text-muted">Contact details coming soon. Email info@revaampapa.com to book.</li>}
            </ul>
          </div>
        </aside>
      </div>
    </>
  )
}
