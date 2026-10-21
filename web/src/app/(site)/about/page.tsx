import type { Metadata } from 'next'
import Link from 'next/link'
import { getHomeData } from '@/lib/data'

export const metadata: Metadata = { title: 'About us', description: 'RevaampAPA brings property aggregation, promotion and project management onto one platform.' }

const VALUES = [
  ['Trust and transparency', 'Every listing is verified before it’s published, and every commission is tracked against your account.'],
  ['Excellence', 'From property verification to project delivery, we hold the work to a high standard.'],
  ['Partnership', 'Owners, promoters, hotels and professionals grow together — the platform only works when they all earn.'],
  ['Innovation', 'Room Voucher cashback, milestone-based building and white-label tools are built for how Nigerians actually transact.'],
]

export default async function AboutPage() {
  const { stats } = await getHomeData()
  return (
    <>
      <section className="wrap grid gap-10 pb-16 pt-12 md:pt-16 lg:grid-cols-[1.3fr_1fr] lg:items-end">
        <div>
          <h1 className="t-hero max-w-[14ch]">Property works better when everyone earns.</h1>
        </div>
        <p className="lede">
          RevaampAPA — Revaamps Aggregation, Promotions and Agency Platform — connects verified property owners with a nationwide promoter network, and gives people building across Africa a project management service they can trust.
        </p>
      </section>

      <section className="border-y border-line bg-white">
        <div className="wrap grid gap-12 py-20 md:grid-cols-3">
          {[
            ['Property aggregation', 'We gather verified properties from trusted owners into one place, so buyers and tenants see quality real estate, not noise.'],
            ['Promotion services', 'Promoters share listings with their networks and earn on every introduction, from properties and buyers to hotels and subscribers.'],
            ['Project management agency', 'Subscribers build with pre-qualified professionals, discounted materials and milestone-based payments, monitored at no extra cost.'],
          ].map(([t, d]) => (
            <div key={t}>
              <h2 className="t-2">{t}</h2>
              <p className="mt-3 text-ink-2">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap grid gap-12 py-20 lg:grid-cols-2">
        <div>
          <h2 className="t-1">Mission</h2>
          <p className="mt-4 text-lg text-ink-2">To make property aggregation and promotion in Nigeria transparent, efficient and rewarding for owners, promoters and investors.</p>
          <h2 className="t-1 mt-12">Vision</h2>
          <p className="mt-4 text-lg text-ink-2">To become Africa’s most trusted platform for property aggregation, promotion and project management — creating wealth for the community that powers it.</p>
        </div>
        <dl className="grid content-start gap-px overflow-hidden rounded-[var(--radius-lg)] border border-line bg-line sm:grid-cols-2">
          {VALUES.map(([t, d]) => (
            <div key={t} className="bg-paper p-7">
              <dt className="t-3">{t}</dt>
              <dd className="mt-2 text-[0.95rem] text-ink-2">{d}</dd>
            </div>
          ))}
        </dl>
      </section>

      {stats.properties + stats.promoters + stats.hotels > 0 && (
        <section className="bg-lagoon text-white">
          <dl className="wrap grid gap-10 py-16 sm:grid-cols-3">
            {[[stats.properties, 'Verified listings live today'], [stats.promoters, 'Approved promoters'], [stats.hotels, 'Partner hotels in the directory']].map(([n, l]) => (
              <div key={l as string}>
                <dd className="font-display text-5xl font-semibold tracking-tight">{Number(n).toLocaleString()}</dd>
                <dt className="mt-2 text-white/70">{l}</dt>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="wrap py-20">
        <h2 className="t-1 max-w-2xl">Ready to join?</h2>
        <p className="lede mt-4">Whether you own property, want to earn, or are building your home, there’s a role for you.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/join" className="btn btn-primary">Choose your role</Link>
          <Link href="/contact" className="btn btn-ghost">Talk to us</Link>
        </div>
      </section>
    </>
  )
}
