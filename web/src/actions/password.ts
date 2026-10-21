'use server'
import crypto from 'node:crypto'
import { redirect } from 'next/navigation'
import { db, Models } from '@/lib/legacy'
import { sendMail, emailShell, esc } from '@/lib/mail'
import { setNotice } from '@/lib/notice'
import { type FormState, str, EMAIL } from '@/lib/form'
import { SITE } from '@/lib/site'

/* eslint-disable @typescript-eslint/no-explicit-any */
const RESETTABLE = ['User', 'Solicitor', 'HectareSolicitor', 'Architect', 'VoucherSubscriber']

async function findAccount(filter: Record<string, unknown>) {
  for (const m of RESETTABLE) {
    const doc = await (Models as any)[m].findOne(filter)
    if (doc) return doc
  }
  return null
}

export async function requestReset(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, 'email').toLowerCase()
  if (!EMAIL.test(email)) return { fieldErrors: { email: 'Enter the email you registered with.' }, values: { email } }
  try {
    await db()
    const user = await findAccount({ email })
    if (user) {
      const token = crypto.randomBytes(32).toString('hex')
      user.resetPasswordToken = token
      user.resetPasswordExpires = Date.now() + 60 * 60 * 1000
      await user.save()
      const url = `${process.env.BASE_URL || SITE.url}/reset-password/${token}`
      await sendMail(
        user.email,
        'Reset your RevaampAPA password',
        emailShell('Reset your password', `<p>Hello ${esc(user.name || '')},</p><p>Use the button below to choose a new password. The link works for one hour.</p>
        <p style="margin:28px 0"><a href="${url}" style="background:#1e2326;color:#fff;padding:13px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Choose a new password</a></p>
        <p style="font-size:13px;color:#64716e">Or paste this link into your browser:<br>${url}</p><p style="font-size:13px;color:#64716e">Didn’t ask for this? You can ignore this email; your password won’t change.</p>`),
      )
    }
  } catch (err) {
    console.error('[forgot-password]', err)
    return { error: 'We couldn’t send the email just now. Try again in a few minutes.', values: { email } }
  }
  // Same answer whether or not the account exists
  return { ok: true, message: `If ${email} has a Revaamp account, a reset link is on its way. Check your inbox and spam folder.` }
}

export async function resetPassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const token = str(fd, 'token')
  const password = String(fd.get('password') || '')
  if (password.length < 8) return { fieldErrors: { password: 'Use at least 8 characters.' } }
  if (password !== fd.get('confirmPassword')) return { fieldErrors: { password: 'The two passwords don’t match.' } }
  try {
    await db()
    const user = await findAccount({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } })
    if (!user) return { error: 'This reset link has expired or was already used. Request a new one.' }
    user.password = password
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined
    await user.save()
  } catch (err) {
    console.error('[reset-password]', err)
    return { error: 'Your password wasn’t changed. Please try again.' }
  }
  await setNotice('success', 'Password changed. Sign in with your new password.')
  redirect('/login')
}

export async function tokenIsValid(token: string) {
  try {
    await db()
    return !!(await findAccount({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } }))
  } catch {
    return false
  }
}
