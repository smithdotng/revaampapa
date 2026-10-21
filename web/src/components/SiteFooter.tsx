import Link from 'next/link'
import { SITE } from '@/lib/site'
import { Logo } from './Logo'

const COLUMNS: { title: string; links: [string, string][] }[] = [
  {
    title: 'Explore',
    links: [
      ['Properties', '/properties'],
      ['Partner hotels', '/hotels'],
      ['Projects', '/projects'],
      ['How it works', '/how-it-works'],
      ['Blog', '/blog'],
    ],
  },
  {
    title: 'Earn & list',
    links: [
      ['Become a promoter', '/promoter/register'],
      ['List your property', '/register'],
      ['Business partner', '/business-partner/register'],
      ['List your hotel', '/partner-hotel/register'],
      ['Room Voucher', '/voucher/register'],
    ],
  },
  {
    title: 'Professionals',
    links: [
      ['Partner solicitor', '/solicitor/register'],
      ['HbH solicitor', '/solicitor/hectare/register'],
      ['Partner architect', '/architect/register'],
      ['Project subscriber', '/project-subscriber/register'],
    ],
  },
  {
    title: 'Company',
    links: [
      ['About', '/about'],
      ['Contact', '/contact'],
      ['Terms', '/terms'],
      ['Privacy', '/privacy'],
      ['Cookies', '/cookies'],
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="bg-lagoon text-white/80">
      <div className="wrap grid grid-cols-1 gap-12 py-16 lg:grid-cols-[1.2fr_2fr]">
        <div className="max-w-sm">
          <Logo tone="light" />
          <p className="mt-5 text-[0.95rem] leading-relaxed text-white/70">{SITE.description}</p>
          <address className="mt-6 not-italic text-[0.95rem] leading-relaxed text-white/70">
            {SITE.address.join(', ')}
            <br />
            <a href={`mailto:${SITE.email}`} className="text-white hover:underline">{SITE.email}</a>
          </address>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <h2 className="font-sans text-sm font-semibold tracking-normal text-white">{c.title}</h2>
              <ul className="mt-4 space-y-2.5 text-[0.95rem]">
                {c.links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="text-white/70 transition-colors hover:text-white">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="wrap flex flex-col gap-3 py-6 text-sm text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {SITE.social.map((s) => (
              <li key={s.href}><a href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-white">{s.label}</a></li>
            ))}
          </ul>
          <p>
            Built by <a href="https://shedfactory.co" className="text-white/75 hover:text-white">Shed Factory</a>
          </p>
        </div>
      </div>
    </footer>
  )
}
