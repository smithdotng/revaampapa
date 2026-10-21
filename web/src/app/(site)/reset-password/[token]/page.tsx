import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthShell } from '@/components/AuthShell'
import { FormAlert } from '@/components/forms'
import { ResetForm } from '@/components/PasswordForms'
import { tokenIsValid } from '@/actions/password'

export const metadata: Metadata = { title: 'Choose a new password', robots: { index: false } }

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const valid = await tokenIsValid(token)
  return (
    <AuthShell title="Choose a new password" aside={<div className="relative"><h2 className="t-2 text-white">Keep it safe</h2><p className="mt-3 text-white/75">Use at least 8 characters, and don’t reuse a password from another site.</p></div>}>
      {valid ? <ResetForm token={token} /> : (
        <div className="grid gap-5">
          <FormAlert error="This reset link has expired or was already used." />
          <Link href="/forgot-password" className="btn btn-primary">Request a new link</Link>
        </div>
      )}
    </AuthShell>
  )
}
