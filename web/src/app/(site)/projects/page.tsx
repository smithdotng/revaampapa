import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ROLES } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Project management for your build',
  description: 'Build your home or project with no upfront payment for construction milestones, pre-qualified contractors and free monitoring.',
}

const BENEFITS = [
  ['No upfront payment per milestone', 'You pay for each construction milestone only after it’s delivered to your satisfaction.'],
  ['Construction finance credit', 'Credit is available to help you complete the project.'],
  ['Instalment design fees', 'Spread the cost of design fees instead of paying in one go.'],
  ['Materials savings and quality', 'Discounts through our partner network, with quality assurance on what goes into your build.'],
  ['Pre-qualified professionals', 'Recommended design professionals, shortlisted contractors and skilled artisans.'],
  ['Free monitoring and evaluation', 'Independent progress monitoring at no extra cost — ideal if you’re building from abroad.'],
]

export default function ProjectsPage() {
  const role = ROLES.find((r) => r.slug === 'project-subscriber')!
  return (
    <>
      <section className="wrap grid gap-12 pb-20 pt-12 md:pt-16 lg:grid-cols-[1.3fr_1fr] lg:items-center">
        <div>
          <h1 className="t-hero max-w-[13ch]">Build your home without the usual risk.</h1>
          <p className="lede mt-6">{role.summary} Revaamp Project Management handles the professionals, materials and monitoring for projects across Africa.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={role.cta.href} className="btn btn-primary">Subscribe</Link>
            <Link href="/contact" className="btn btn-ghost">Discuss your project</Link>
          </div>
        </div>
        <div className="roof-frame relative mx-auto aspect-[4/5] w-full max-w-[420px] overflow-hidden bg-lagoon">
          <Image src="/brand/hero-3.png" alt="A smiling site worker in a hard hat" fill sizes="420px" className="object-contain object-bottom pt-[18%]" priority />
        </div>
      </section>
      <section className="border-t border-line bg-white">
        <div className="wrap py-20">
          <h2 className="t-1 max-w-2xl">What your subscription covers</h2>
          <dl className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map(([t, d]) => (
              <div key={t} className="border-t-2 border-ink pt-5">
                <dt className="t-3">{t}</dt>
                <dd className="mt-2 text-ink-2">{d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <section className="wrap py-20">
        <div className="grid gap-8 rounded-[var(--radius-xl)] bg-lagoon p-8 text-white md:grid-cols-[1fr_auto] md:items-center md:p-12">
          <div>
            <h2 className="t-2 text-white">Featured projects are on the way</h2>
            <p className="mt-2 max-w-xl text-white/75">We’re preparing case studies from current builds. Start yours now and it could be one of them.</p>
          </div>
          <Link href={role.cta.href} className="btn btn-light">Start your project</Link>
        </div>
      </section>
    </>
  )
}
