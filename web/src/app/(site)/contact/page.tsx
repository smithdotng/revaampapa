import type { Metadata } from 'next'
import { Fragment } from 'react'
import { SITE } from '@/lib/site'
import { ContactForm } from './ContactForm'

export const metadata: Metadata = { title: 'Contact us', description: 'Talk to the RevaampAPA team in Jabi, Abuja.' }

export default function ContactPage() {
  return (
    <div className="wrap grid grid-cols-1 gap-14 py-12 md:py-16 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div>
        <h1 className="t-1">Talk to us</h1>
        <p className="lede mt-3">Questions about a listing, a partnership or your account. We reply within one working day.</p>
        <div className="mt-10 rounded-[var(--radius-lg)] border border-line bg-white p-6 md:p-8"><ContactForm /></div>
      </div>
      <aside className="grid content-start gap-10 lg:pt-24">
        <section>
          <h2 className="t-3">Visit</h2>
          <address className="mt-2 not-italic leading-relaxed text-ink-2">{SITE.address.map((l) => <span key={l} className="block">{l}</span>)}</address>
          <a className="link mt-2 inline-block text-sm" href="https://www.google.com/maps/search/?api=1&query=Ebitu+Ukiwe+Street+Jabi+Abuja" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>
        </section>
        <section>
          <h2 className="t-3">Email</h2>
          <p className="mt-2 grid gap-1"><a href={`mailto:${SITE.email}`} className="link">{SITE.email}</a><a href={`mailto:${SITE.supportEmail}`} className="link">{SITE.supportEmail}</a></p>
        </section>
        <section>
          <h2 className="t-3">Call</h2>
          <p className="mt-2"><a href={`tel:${SITE.phone.replace(/\s/g, '')}`} className="link">{SITE.phone}</a></p>
        </section>
        <section>
          <h2 className="t-3">Office hours</h2>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-ink-2">
            {SITE.hours.map(([d, h]) => (<Fragment key={d}><dt>{d}</dt><dd>{h}</dd></Fragment>))}
          </dl>
        </section>
      </aside>
    </div>
  )
}
