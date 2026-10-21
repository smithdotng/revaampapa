import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser, dashboardPath, takeLegacyFlash } from '@/lib/session'
import { AuthShell } from '@/components/AuthShell'
import { FormAlert } from '@/components/forms'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  const user = await getCurrentUser()
  // Signing in re-renders this page with the new session, so honour ?next here too
  const safe = next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/login') ? next : ''
  if (user) redirect(user.type === 'project_subscriber' ? dashboardPath(user.type) : safe || dashboardPath(user.type))
  // Messages queued by the Express app (e.g. after a dashboard redirect)
  const flash = await takeLegacyFlash()

  return (
    <AuthShell
      title="Sign in"
      intro="One sign-in for every Revaamp account: owners, promoters, partners, subscribers and professionals."
      aside={
        <div className="relative">
          <h2 className="t-2 text-white">New to Revaamp?</h2>
          <p className="mt-3 text-white/75">Pick the role that fits. Promoter accounts are free and ready in two minutes.</p>
          <div className="mt-6 grid gap-3">
            <Link href="/promoter/register" className="btn btn-light">Become a promoter — free</Link>
            <Link href="/join" className="btn btn-ghost-light">See all nine roles</Link>
          </div>
        </div>
      }
    >
      <div className="grid gap-3">
        {flash.map((f, i) => (
          <FormAlert key={i} error={f.type === 'error' ? f.text : undefined} message={f.type !== 'error' ? f.text : undefined} />
        ))}
      </div>
      <div className={flash.length ? 'mt-5' : ''}>
        <LoginForm next={next} />
      </div>
    </AuthShell>
  )
}
