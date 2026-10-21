import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { db, Models, type AnyModel } from './legacy'
import { getSession, dashboardPath, type UserType } from './session'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Which collection holds each account type. */
export function modelFor(type: UserType): AnyModel {
  switch (type) {
    case 'solicitor':
      return Models.Solicitor
    case 'hectare_solicitor':
      return Models.HectareSolicitor
    case 'architect':
      return Models.Architect
    case 'voucher_subscriber':
      return Models.VoucherSubscriber
    default:
      return Models.User
  }
}

export type Viewer = { id: string; type: UserType; name: string; email: string; doc: any }

async function currentPath() {
  const h = await headers()
  return h.get('x-rv-path') || ''
}

/**
 * Load the signed-in account for a dashboard, or send the visitor where they belong:
 * not signed in → /login?next=…, wrong role → their own dashboard.
 * Cached per request so layouts and pages share one lookup.
 */
export const requireRole = cache(async (...types: UserType[]): Promise<Viewer> => {
  const s = await getSession()
  if (!s?.data.userId) {
    const next = await currentPath()
    redirect(next ? `/login?next=${encodeURIComponent(next)}` : '/login')
  }
  const type = s.data.userType as UserType
  if (!types.includes(type)) redirect(dashboardPath(type))
  await db()
  const doc = await modelFor(type).findById(s.data.userId)
  if (!doc) redirect('/logout')
  if (doc.isSuspended) redirect('/logout')
  return { id: String(doc._id), type, name: doc.name, email: doc.email, doc }
})

/** JSON-safe copy of a Mongoose document or lean object for client components. */
export function plain<T = any>(v: unknown): T {
  return v == null ? (v as T) : JSON.parse(JSON.stringify(v))
}

export function baseUrl() {
  return (process.env.BASE_URL || 'https://revaampapa.com').replace(/\/$/, '')
}
