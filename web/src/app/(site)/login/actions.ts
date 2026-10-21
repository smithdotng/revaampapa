'use server'
import { db, Models } from '@/lib/legacy'
import { createSession, dashboardPath, type UserType } from '@/lib/session'
import { str } from '@/lib/form'

/* eslint-disable @typescript-eslint/no-explicit-any */

export type LoginState = { error?: string; email?: string; redirectTo?: string }

const SOURCES: [string, UserType | 'user'][] = [
  ['User', 'user'],
  ['Solicitor', 'solicitor'],
  ['HectareSolicitor', 'hectare_solicitor'],
  ['Architect', 'architect'],
  ['PartnerHotel', 'partner_hotel'],
  ['VoucherSubscriber', 'voucher_subscriber'],
]

function safeNext(next: string) {
  return next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/login') ? next : ''
}

export async function login(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const email = str(fd, 'email').toLowerCase()
  const password = String(fd.get('password') || '')
  const remember = fd.get('remember') === 'on'
  const next = safeNext(str(fd, 'next'))
  if (!email || !password) return { error: 'Enter your email and password.', email }

  try {
    await db()
    let user: any = null
    let fallbackType: string = 'user'
    for (const [model, type] of SOURCES) {
      user = await (Models as any)[model].findOne({ email })
      if (user) { fallbackType = type; break }
    }
    const generic = { error: 'That email and password don’t match an account. Check for typos, or reset your password.', email }
    if (!user) return generic

    const type: string = user.userType || fallbackType
    if (type === 'partner_hotel') {
      return { error: 'Partner hotels don’t have a sign-in area. We email you about your application and listing — for anything else, write to info@revaampapa.com.', email }
    }
    if (!(await user.comparePassword(password))) return generic
    if (user.isSuspended) return { error: 'This account is suspended. Please contact support@revaampapa.com.', email }

    // Accounts that exist but can't use a dashboard yet
    const pending =
      (type === 'promoter' && !user.promoterProfile?.isApproved && 'Your promoter account is awaiting approval. We’ll email you when it’s ready.') ||
      (type === 'business_partner' && user.businessPartnerProfile?.paymentStatus !== 'confirmed' && (user.promoterProfile as any)?.paymentStatus !== 'confirmed' && 'Your ₦20,000 payment is still being verified. We’ll email you once it’s confirmed.') ||
      (type === 'solicitor' && !user.partnerProfile?.isActive && 'Your Partner Solicitor application is under review. We’ll email you when it’s approved.') ||
      (type === 'hectare_solicitor' && !user.hectareProfile?.isActive && 'Your HbH Solicitor application is under review. We’ll email you when it’s approved.') ||
      (type === 'architect' && !user.architectProfile?.isActive && 'Your Partner Architect application is under review. We’ll email you when it’s approved.')
    if (pending) return { error: pending, email }

    await createSession(
      { userId: String(user._id), userType: type as UserType, userName: user.name, userEmail: user.email },
      remember,
    )

    if (type === 'project_subscriber' && (!user.projectSubscriberProfile?.isApproved || user.projectSubscriberProfile?.subscriptionStatus !== 'active')) {
      return { redirectTo: '/project-subscriber/subscription' }
    }
    return { redirectTo: next || dashboardPath(type) }
  } catch (err) {
    console.error('[login]', err)
    return { error: 'We couldn’t sign you in just now. Try again in a moment.', email }
  }
}
