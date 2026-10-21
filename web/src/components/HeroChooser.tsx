'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

type Intent = {
  key: string
  label: string
  headline: string
  body: string
  primary: { label: string; href: string }
  secondary: { label: string; href: string }
  image: { src: string; cutout: boolean; alt: string }
}

const INTENTS: Intent[] = [
  {
    key: 'find',
    label: 'Find a property',
    headline: 'Verified property, ready to view.',
    body: 'Land, buildings, shops and shortlets across Africa. Our team checks every listing before it goes live, and you can message the owner straight from the page.',
    primary: { label: 'Browse properties', href: '/properties' },
    secondary: { label: 'How verification works', href: '/how-it-works#owners' },
    image: { src: '/brand/hero-2.png', cutout: false, alt: 'Model apartment blocks standing on a globe' },
  },
  {
    key: 'earn',
    label: 'Earn as a promoter',
    headline: 'Share a listing. Earn up to 90% of the fee.',
    body: 'Promoter registration is free. You earn when a property, a buyer or another promoter you introduce leads to a deal — plus hotel and Room Voucher commissions.',
    primary: { label: 'Become a promoter — free', href: '/promoter/register' },
    secondary: { label: 'See the commission structure', href: '/how-it-works#promoters' },
    image: { src: '/brand/hero-1.png', cutout: true, alt: 'A promoter sharing a listing from his phone' },
  },
  {
    key: 'list',
    label: 'List my property',
    headline: 'Your property, in front of a network across Africa.',
    body: 'Register free and list as many properties as you like. Each listing is verified for ₦20,000, then marketed by promoters across Africa.',
    primary: { label: 'List your property', href: '/register' },
    secondary: { label: 'Owner benefits', href: '/join#property-owner' },
    image: { src: '/brand/hero-2.png', cutout: false, alt: 'Model apartment blocks standing on a globe' },
  },
  {
    key: 'build',
    label: 'Build my home',
    headline: 'Build without paying upfront for each stage.',
    body: 'Pay only after every construction milestone is delivered to your satisfaction, with pre-qualified contractors, discounted materials and free monitoring.',
    primary: { label: 'Subscribe to project management', href: '/project-subscriber/register' },
    secondary: { label: 'What’s included', href: '/projects' },
    image: { src: '/brand/hero-3.png', cutout: true, alt: 'A smiling site worker in a hard hat' },
  },
  {
    key: 'stay',
    label: 'Stay for less',
    headline: 'Hotel stays that pay you back.',
    body: 'One Room Voucher membership covers every hotel in the Revaamp directory. Register a stay before check-in, book as normal, and get your discount back as cashback.',
    primary: { label: 'See partner hotels', href: '/hotels' },
    secondary: { label: 'Subscribe to the Room Voucher', href: '/voucher/register' },
    image: { src: '/brand/hero-1.png', cutout: true, alt: 'A guest checking his booking on a phone' },
  },
  {
    key: 'learn',
    label: 'Learn more',
    headline: 'One programme for property across Africa.',
    body: 'Revaamp verifies listings, rewards the promoters who market them, partners with hotels and manages builds — so owners, buyers, investors and builders across Africa can deal with confidence.',
    primary: { label: 'How Revaamp works', href: '/how-it-works' },
    secondary: { label: 'About Revaamp', href: '/about' },
    image: { src: '/brand/hero-2.png', cutout: false, alt: 'Model apartment blocks standing on a globe' },
  },
]

export function HeroChooser({ stats }: { stats: { properties: number; promoters: number; hotels: number } }) {
  const [active, setActive] = useState(0)
  const it = INTENTS[active]

  return (
    <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
      <div>
        <p className="max-w-xl text-[1.05rem] text-ink-2">
          RevaampAPA brings property owners, promoters, hotels and builders across Africa onto one platform.
          <span className="text-ink"> What brings you here?</span>
        </p>

        <div role="group" aria-label="What brings you here?" className="-mx-1 mt-5 flex flex-wrap gap-2">
          {INTENTS.map((x, i) => (
            <button
              key={x.key}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={i === active}
              className={`min-h-11 rounded-full border px-4 text-[0.95rem] font-medium transition-colors ${
                i === active
                  ? 'border-ink bg-ink text-white'
                  : 'border-line-2 bg-white text-ink-2 hover:border-ink hover:text-ink'
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>

        <div key={it.key} className="[animation:rv-fade_.45s_var(--ease-out-soft)]" aria-live="polite">
          <h1 className="t-hero mt-9 max-w-[13ch]">{it.headline}</h1>
          <p className="lede mt-6">{it.body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={it.primary.href} className="btn btn-primary">{it.primary.label}</Link>
            <Link href={it.secondary.href} className="btn btn-ghost">{it.secondary.label}</Link>
          </div>
        </div>

        <dl className="mt-12 grid max-w-xl grid-cols-3 gap-6 border-t border-line pt-6 empty:hidden">
          {[
            [stats.properties, 'verified listings'],
            [stats.promoters, 'active promoters'],
            [stats.hotels, 'partner hotels'],
          ]
            // Only show figures that read as a track record
            .filter(([n]) => Number(n) >= 10)
            .map(([n, l]) => (
            <div key={l as string}>
              <dt className="sr-only">{l}</dt>
              <dd className="font-display text-3xl font-semibold tracking-tight text-ink">{Number(n).toLocaleString()}</dd>
              <dd className="text-sm text-muted">{l}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* The roofline frame: the chevron from the Revaamp mark */}
      <div className="relative mx-auto w-full max-w-[460px] lg:max-w-none">
        <div className="roof-frame relative aspect-[4/5] overflow-hidden bg-lagoon">
          {INTENTS.filter((x, i, a) => a.findIndex((y) => y.image.src === x.image.src) === i).map((x) => (
            <Image
              key={x.image.src}
              src={x.image.src}
              alt={x.image.src === it.image.src ? it.image.alt : ''}
              aria-hidden={x.image.src !== it.image.src}
              fill
              priority={x.image.src === INTENTS[0].image.src}
              sizes="(min-width: 1024px) 480px, 90vw"
              className={`transition-opacity duration-700 ease-[var(--ease-out-soft)] ${
                x.image.cutout ? 'object-contain object-bottom pt-[18%]' : 'object-cover'
              } ${x.image.src === it.image.src ? 'opacity-100' : 'opacity-0'}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
