import 'server-only'
import { cookies } from 'next/headers'

export type NoticeType = 'success' | 'error' | 'info'

/** One-shot message shown on the next page (read and cleared by <NoticeToast />). */
export async function setNotice(type: NoticeType, text: string) {
  ;(await cookies()).set('rv_notice', encodeURIComponent(JSON.stringify({ type, text })), {
    path: '/',
    maxAge: 60,
    sameSite: 'lax',
  })
}
