'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { Menu, X } from 'lucide-react'

export function HeaderShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <header
      className={`sticky top-0 z-50 transition-[background-color,box-shadow,border-color] duration-300 ${
        scrolled ? 'border-b border-line bg-white/90 backdrop-blur-md' : 'border-b border-transparent bg-paper'
      }`}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded focus:bg-ink focus:px-3 focus:py-2 focus:text-white">
        Skip to content
      </a>
      {children}
    </header>
  )
}

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')
}

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname()
  const active = isActive(pathname, href)
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`relative rounded-full px-3 py-2 text-[0.95rem] font-medium transition-colors ${
        active ? 'text-ink' : 'text-ink-2 hover:text-ink'
      }`}
    >
      {children}
      {active && <span className="absolute inset-x-3 -bottom-[1px] h-[2px] rounded bg-roof" />}
    </Link>
  )
}

type Account = { name: string; dashboard: string } | null

export function MobileMenu({ nav, account }: { nav: { label: string; href: string }[]; account: Account }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <div className="ml-auto lg:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        className="grid size-11 place-items-center rounded-full border border-line-2 bg-white"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
        <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
      </button>
      {open && (
        <div id="mobile-nav" className="fixed inset-x-0 bottom-0 top-[72px] z-40 overflow-y-auto bg-paper [animation:rv-fade_.25s_var(--ease-out-soft)]">
          <nav aria-label="Mobile" className="wrap flex flex-col py-4">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive(pathname, n.href) ? 'page' : undefined}
                className="border-b border-line py-4 font-display text-2xl font-semibold tracking-tight text-ink aria-[current=page]:text-teal-ink"
              >
                {n.label}
              </Link>
            ))}
            <div className="mt-8 grid gap-3">
              {account ? (
                <>
                  <a href={account.dashboard} className="btn btn-primary">{account.name}’s dashboard</a>
                  <a href="/logout" className="btn btn-ghost">Sign out</a>
                </>
              ) : (
                <>
                  <Link href="/join" className="btn btn-primary">Join Revaamp</Link>
                  <Link href="/login" className="btn btn-ghost">Sign in</Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </div>
  )
}
