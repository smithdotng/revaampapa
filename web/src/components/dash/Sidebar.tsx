'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Home, Building2, Link2, Hotel, Handshake, Inbox, ChartColumn, Wallet, Gavel, Settings, Plus, Shield,
  CreditCard, CalendarDays, LogOut, ArrowUpRight, Menu, X, FileText, Megaphone, Briefcase, Users, HardHat,
  Ticket, Receipt, UserRound,
} from 'lucide-react'
import type { NavItem } from '@/lib/roles'

const ICONS = {
  home: Home, building: Building2, link: Link2, hotel: Hotel, handshake: Handshake, inbox: Inbox, chart: ChartColumn,
  wallet: Wallet, gavel: Gavel, settings: Settings, plus: Plus, shield: Shield, card: CreditCard, calendar: CalendarDays,
  file: FileText, megaphone: Megaphone, briefcase: Briefcase, users: Users, hardhat: HardHat, ticket: Ticket, receipt: Receipt,
  user: UserRound,
} as const

function isActive(path: string, item: NavItem) {
  if (path === item.href || path.startsWith(item.href + '/')) return true
  return (item.match || []).some((m) => path.startsWith(m))
}

function NavList({ nav, onNavigate }: { nav: NavItem[]; onNavigate?: () => void }) {
  const path = usePathname()
  // Most specific match wins, so "Add property" doesn't also light up "Overview"
  const active = nav
    .filter((n) => isActive(path, n))
    .sort((a, b) => (path === b.href ? 1 : 0) - (path === a.href ? 1 : 0) || b.href.length - a.href.length)[0]
  return (
    <ul className="grid gap-0.5">
      {nav.map((n, i) => {
        const Icon = ICONS[n.icon as keyof typeof ICONS] || Home
        const on = active?.href === n.href
        const external = !n.href.startsWith('/' + (nav[0].href.split('/')[1] || ''))
        return (
          <li key={n.href}>
            {n.section && <p className={`px-3 pb-1.5 text-xs font-semibold text-muted ${i === 0 ? 'pt-1' : 'pt-4'}`}>{n.section}</p>}
            <Link
              href={n.href}
              onClick={onNavigate}
              aria-current={on ? 'page' : undefined}
              className={`group flex min-h-11 items-center gap-3 rounded-[var(--radius-sm)] px-3 text-[0.95rem] font-medium transition-colors ${
                on ? 'bg-lagoon text-white' : 'text-ink-2 hover:bg-paper hover:text-ink'
              }`}
            >
              <Icon className={`size-[18px] shrink-0 ${on ? 'text-white' : 'text-muted group-hover:text-ink'}`} aria-hidden />
              <span className="flex-1">{n.label}</span>
              {!!n.badge && (
                <span className={`min-w-6 rounded-full px-1.5 text-center text-xs font-semibold leading-5 ${on ? 'bg-white text-lagoon' : 'bg-roof text-white'}`} aria-label={`${n.badge} waiting`}>{n.badge > 99 ? '99+' : n.badge}</span>
              )}
              {external && <ArrowUpRight className="size-3.5 opacity-50" aria-hidden />}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

type Props = { nav: NavItem[]; roleLabel: string; name: string; email: string; status?: { label: string; tone: string } }

function AccountCard({ roleLabel, name, email, status }: Omit<Props, 'nav'>) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-line p-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-mist font-display text-sm font-semibold text-lagoon">{initials || 'R'}</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{name}</p>
        <p className="truncate text-xs text-muted">{roleLabel}</p>
        {status && <p className={`truncate text-xs font-semibold ${status.tone === 'ok' ? 'text-ok' : status.tone === 'bad' ? 'text-danger' : 'text-[#a24d0e]'}`}>{status.label}</p>}
        <span className="sr-only">{email}</span>
      </div>
    </div>
  )
}

function Footer() {
  return (
    <div className="grid gap-0.5 border-t border-line pt-3">
      <Link href="/" className="flex min-h-10 items-center gap-3 rounded-[var(--radius-sm)] px-3 text-sm text-muted hover:bg-paper hover:text-ink">
        <ArrowUpRight className="size-4" aria-hidden /> Back to the website
      </Link>
      <a href="/logout" className="flex min-h-10 items-center gap-3 rounded-[var(--radius-sm)] px-3 text-sm text-muted hover:bg-paper hover:text-danger">
        <LogOut className="size-4" aria-hidden /> Sign out
      </a>
    </div>
  )
}

export function Sidebar(props: Props) {
  const [open, setOpen] = useState(false)
  const path = usePathname()
  useEffect(() => setOpen(false), [path])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Desktop */}
      <div className="hidden w-[272px] shrink-0 border-r border-line bg-white lg:block">
      <aside className="sticky top-0 flex h-dvh flex-col gap-6 overflow-y-auto px-4 py-6">
        <Link href="/" className="px-2" aria-label="RevaampAPA home">
          <Image src="/brand/logo.png" alt="Revaamp" width={200} height={60} className="h-9 w-auto" priority />
        </Link>
        <AccountCard {...props} />
        <nav aria-label="Dashboard" className="flex-1"><NavList nav={props.nav} /></nav>
        <Footer />
      </aside>
      </div>

      {/* Mobile */}
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur lg:hidden">
        <Link href="/" aria-label="RevaampAPA home"><Image src="/brand/logo.png" alt="Revaamp" width={200} height={60} className="h-8 w-auto" /></Link>
        <button onClick={() => setOpen(true)} className="grid size-11 place-items-center rounded-full border border-line-2" aria-label="Open dashboard menu" aria-expanded={open}>
          <Menu className="size-5" />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Dashboard menu">
          <button className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} aria-label="Close menu" />
          <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-[320px] flex-col gap-5 overflow-y-auto bg-white px-4 py-5 [animation:rv-fade_.2s_ease-out]">
            <div className="flex items-center justify-between px-1">
              <Image src="/brand/logo.png" alt="Revaamp" width={200} height={60} className="h-8 w-auto" />
              <button onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-full border border-line-2" aria-label="Close menu"><X className="size-5" /></button>
            </div>
            <AccountCard {...props} />
            <nav aria-label="Dashboard" className="flex-1"><NavList nav={props.nav} onNavigate={() => setOpen(false)} /></nav>
            <Footer />
          </div>
        </div>
      )}
    </>
  )
}
