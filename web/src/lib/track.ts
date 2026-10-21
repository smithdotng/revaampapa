import 'server-only'
import { headers } from 'next/headers'

export async function visitor() {
  const h = await headers()
  return {
    ipAddress: h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || undefined,
    userAgent: h.get('user-agent') || undefined,
    referrer: h.get('referer') || undefined,
  }
}

export const go = (to: string) => new Response(null, { status: 302, headers: { Location: to } })
