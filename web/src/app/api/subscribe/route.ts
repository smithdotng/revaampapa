import { EMAIL } from '@/lib/form'
import { sendMail, emailShell, esc } from '@/lib/mail'
import { SITE } from '@/lib/site'
import { bodyAsFormData } from '../_json'

/** Newsletter sign-up: forwards the address to the team inbox (the old site only logged it). */
export async function POST(req: Request) {
  const fd = await bodyAsFormData(req)
  const email = String(fd.get('email') || '').trim().toLowerCase()
  if (!EMAIL.test(email)) return Response.json({ success: false, message: 'Invalid email address' }, { status: 400 })
  try {
    await sendMail(SITE.email, 'New newsletter subscriber', emailShell('New newsletter subscriber', `<p>${esc(email)} subscribed on ${esc(SITE.url)}.</p>`))
  } catch (err) {
    console.error('[subscribe]', err)
  }
  return Response.json({ success: true, message: 'Successfully subscribed!' })
}
