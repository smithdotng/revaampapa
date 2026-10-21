import Link from 'next/link'
import { getCurrentUser, dashboardPath } from '@/lib/session'
import { NAV } from '@/lib/site'
import { Logo } from './Logo'
import { HeaderShell, MobileMenu, NavLink } from './HeaderClient'

export async function SiteHeader() {
  const user = await getCurrentUser()
  const firstName = user?.name?.split(' ')[0]
  const account = user ? { name: firstName || 'Account', dashboard: dashboardPath(user.type) } : null

  return (
    <HeaderShell>
      <div className="wrap flex h-[72px] items-center gap-6">
        <Logo />
        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <NavLink key={n.href} href={n.href}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          {account ? (
            <>
              <a href="/logout" className="px-3 py-2 text-[0.95rem] font-medium text-ink-2 hover:text-ink">
                Sign out
              </a>
              {/* Dashboards are still served by the Express app, so use a full page load */}
              <a href={account.dashboard} className="btn btn-primary">
                {account.name}’s dashboard
              </a>
            </>
          ) : (
            <>
              <Link href="/login" className="px-3 py-2 text-[0.95rem] font-medium text-ink-2 hover:text-ink">
                Sign in
              </Link>
              <Link href="/join" className="btn btn-primary">
                Join Revaamp
              </Link>
            </>
          )}
        </div>
        <MobileMenu nav={NAV} account={account} />
      </div>
    </HeaderShell>
  )
}
