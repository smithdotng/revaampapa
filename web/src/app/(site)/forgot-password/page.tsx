import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthShell } from '@/components/AuthShell'
import { ForgotForm } from '@/components/PasswordForms'

export const metadata: Metadata = { title: 'Reset your password', robots: { index: false } }

export default function ForgotPage() {
  return (
    <AuthShell
      title="Reset your password"
      intro="Enter the email on your account and we’ll send a link to choose a new password."
      aside={<div className="relative"><h2 className="t-2 text-white">Remembered it?</h2><p className="mt-3 text-white/75">Go back and sign in.</p><Link href="/login" className="btn btn-light mt-6">Sign in</Link></div>}
    >
      <ForgotForm />
    </AuthShell>
  )
}
