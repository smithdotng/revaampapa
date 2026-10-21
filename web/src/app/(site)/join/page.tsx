import type { Metadata } from 'next'
import Link from 'next/link'
import { ROLES } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Join Revaamp — compare every role',
  description: 'Nine ways to work with Revaamp: what each role earns, what it costs, and who it’s for.',
}

const GROUPS: { key: string; title: string; text: string }[] = [
  { key: 'earn', title: 'Earn from introductions', text: 'Share listings, bring buyers and grow a network.' },
  { key: 'property', title: 'Own or build property', text: 'List what you own, or build with milestone-based payments.' },
  { key: 'hotels', title: 'Hotels and travel', text: 'Fill your rooms, or get cashback on your stays.' },
  { key: 'professional', title: 'Legal and design professionals', text: 'Bring your practice into the Revaamp pipeline.' },
]

export default function JoinPage() {
  return (
    <>
      <section className="wrap pb-10 pt-12 md:pt-16">
        <h1 className="t-1 max-w-3xl">Choose how you’ll work with Revaamp</h1>
        <p className="lede mt-4">Every role has its own sign-up and dashboard. Not sure? Most people start as a promoter — it’s free, and you can add another role later.</p>
      </section>
      {GROUPS.map((g) => (
        <section key={g.key} className="wrap border-t border-line py-12" aria-labelledby={`g-${g.key}`}>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
            <div>
              <h2 id={`g-${g.key}`} className="t-2">{g.title}</h2>
              <p className="mt-2 text-ink-2">{g.text}</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {ROLES.filter((r) => r.group === g.key).map((r) => (
                <article key={r.slug} id={r.slug} className="flex scroll-mt-28 flex-col rounded-[var(--radius-lg)] border border-line bg-white p-7">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="t-3">{r.name}</h3>
                    <p className="text-right">
                      <span className="block font-display text-2xl font-semibold leading-none tracking-tight">{r.figure}</span>
                      <span className="mt-1 block max-w-[12rem] text-xs text-muted">{r.figureLabel}</span>
                    </p>
                  </div>
                  <p className="mt-3 text-ink-2">{r.summary}</p>
                  <ul className="mt-5 grid flex-1 gap-2 text-[0.95rem] text-ink-2">
                    {r.benefits.map((b) => (
                      <li key={b} className="flex gap-3"><span aria-hidden className="mt-[0.65em] h-[2px] w-3 shrink-0 bg-roof" />{b}</li>
                    ))}
                  </ul>
                  <Link href={r.cta.href} className="btn btn-primary mt-7 self-start">{r.cta.label}</Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      ))}
      <section className="wrap border-t border-line py-12">
        <p className="text-ink-2">Already have an account? <Link href="/login" className="link font-medium">Sign in</Link></p>
      </section>
    </>
  )
}
