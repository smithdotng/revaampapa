import 'server-only'
import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { db } from './legacy'

/**
 * Reads and writes the same sessions the Express app uses
 * (express-session + connect-mongo, cookie "connect.sid").
 *
 * Signing a user in here produces a session the Express dashboards accept,
 * and a user who signed in on Express is recognised here. That is what lets
 * the two apps run side by side during the migration.
 */

export const SESSION_COOKIE = 'connect.sid'
const COLLECTION = 'sessions'
const DAY = 24 * 60 * 60 * 1000

export type UserType =
  | 'property_owner'
  | 'promoter'
  | 'business_partner'
  | 'project_subscriber'
  | 'admin'
  | 'superadmin'
  | 'solicitor'
  | 'hectare_solicitor'
  | 'architect'
  | 'voucher_subscriber'
  | 'partner_hotel'

export type VoucherMode = { id: string; code: string; name: string } | null

export type SessionData = {
  cookie?: { originalMaxAge: number | null; expires?: string; secure?: boolean; httpOnly?: boolean; path?: string }
  userId?: string
  userType?: UserType
  userName?: string
  userEmail?: string
  voucherMode?: VoucherMode
  flash?: Record<string, string[]>
  [key: string]: unknown
}

function secret(): string {
  const s = process.env.SESSION_SECRET
  if (!s) {
    if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET is not set')
    return 'revaampap-secret-key-change-in-production' // matches the Express default
  }
  return s
}

// cookie-signature compatible
function sign(value: string): string {
  const mac = crypto.createHmac('sha256', secret()).update(value).digest('base64').replace(/=+$/, '')
  return `${value}.${mac}`
}

function unsign(signed: string): string | false {
  const value = signed.slice(0, signed.lastIndexOf('.'))
  const expected = Buffer.from(sign(value))
  const given = Buffer.from(signed)
  return expected.length === given.length && crypto.timingSafeEqual(expected, given) ? value : false
}

async function collection() {
  const m = await db()
  // connect-mongo stores the session id (a string) as _id
  return m.connection.db!.collection<SessionDoc>(COLLECTION)
}

async function readSid(): Promise<string | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value
  if (!raw) return null
  const decoded = decodeURIComponent(raw)
  if (!decoded.startsWith('s:')) return null
  const sid = unsign(decoded.slice(2))
  return sid || null
}

type SessionDoc = { _id: string; expires: Date; session: string | SessionData; lastModified?: Date }

function parse(doc: SessionDoc | null): SessionData | null {
  if (!doc) return null
  if (doc.expires && new Date(doc.expires).getTime() < Date.now()) return null
  try {
    return typeof doc.session === 'string' ? (JSON.parse(doc.session) as SessionData) : doc.session
  } catch {
    return null
  }
}

export async function getSession(): Promise<{ sid: string; data: SessionData } | null> {
  const sid = await readSid()
  if (!sid) return null
  try {
    const col = await collection()
    const data = parse((await col.findOne({ _id: sid })) as SessionDoc | null)
    return data ? { sid, data } : null
  } catch (err) {
    console.error('[session] read failed:', (err as Error).message)
    return null
  }
}

export type CurrentUser = { id: string; name: string; email: string; type: UserType }

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const s = await getSession()
  if (!s?.data.userId) return null
  return {
    id: String(s.data.userId),
    name: s.data.userName || '',
    email: s.data.userEmail || '',
    type: (s.data.userType || 'property_owner') as UserType,
  }
}

async function persist(sid: string, data: SessionData, maxAge: number) {
  const expires = new Date(Date.now() + maxAge)
  data.cookie = {
    originalMaxAge: maxAge,
    expires: expires.toISOString(),
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    path: '/',
  }
  const col = await collection()
  await col.updateOne(
    { _id: sid },
    { $set: { expires, session: JSON.stringify(data), lastModified: new Date() } },
    { upsert: true },
  )
  return expires
}

async function setCookie(sid: string, expires: Date) {
  ;(await cookies()).set(SESSION_COOKIE, `s:${sign(sid)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires,
  })
}

/** Start a fresh session (new id, so a pre-login id can't be fixed on the user). */
export async function createSession(data: SessionData, remember = false) {
  const previous = await readSid()
  const sid = crypto.randomBytes(24).toString('base64url')
  const maxAge = remember ? 30 * DAY : DAY
  const expires = await persist(sid, data, maxAge)
  await setCookie(sid, expires)
  if (previous) {
    try { await (await collection()).deleteOne({ _id: previous }) } catch {}
  }
}

/** Merge values into the visitor's session, creating an anonymous one if needed. */
export async function updateSession(patch: Partial<SessionData>) {
  const current = await getSession()
  if (current) {
    const maxAge = current.data.cookie?.originalMaxAge || DAY
    const next = { ...current.data, ...patch }
    const expires = await persist(current.sid, next, maxAge)
    await setCookie(current.sid, expires)
    return
  }
  const sid = crypto.randomBytes(24).toString('base64url')
  const expires = await persist(sid, { ...patch }, DAY)
  await setCookie(sid, expires)
}

export async function destroySession() {
  const sid = await readSid()
  if (sid) {
    try { await (await collection()).deleteOne({ _id: sid }) } catch {}
  }
  ;(await cookies()).delete(SESSION_COOKIE)
}

/** Messages the Express app queued with connect-flash (e.g. "Please login"). */
export async function takeLegacyFlash(): Promise<{ type: string; text: string }[]> {
  const s = await getSession()
  const flash = s?.data.flash
  if (!s || !flash || !Object.keys(flash).length) return []
  const out: { type: string; text: string }[] = []
  for (const [type, list] of Object.entries(flash)) for (const text of list || []) out.push({ type, text })
  try {
    const col = await collection()
    const next = { ...s.data, flash: {} }
    await col.updateOne({ _id: s.sid }, { $set: { session: JSON.stringify(next) } })
  } catch {}
  return out
}

/** Where each account type lands after signing in. */
export function dashboardPath(type?: string): string {
  switch (type) {
    case 'superadmin':
      return '/superadmin/dashboard'
    case 'admin':
      // The Express app never let plain admins into the superadmin area either
      return '/'
    case 'property_owner':
      return '/property-owner/dashboard'
    case 'promoter':
      return '/promoter/dashboard'
    case 'business_partner':
      return '/business-partner/dashboard'
    case 'project_subscriber':
      return '/project-subscriber/dashboard'
    case 'solicitor':
      return '/solicitor/dashboard'
    case 'hectare_solicitor':
      return '/hectare-solicitor/dashboard'
    case 'architect':
      return '/architect/dashboard'
    case 'voucher_subscriber':
      return '/voucher/dashboard'
    default:
      return '/dashboard'
  }
}
