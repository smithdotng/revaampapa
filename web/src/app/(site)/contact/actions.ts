'use server'
import { type FormState, formValues, str, EMAIL } from '@/lib/form'
import { sendMail, emailShell, esc } from '@/lib/mail'
import { SITE } from '@/lib/site'

export async function sendContact(_p: FormState, fd: FormData): Promise<FormState> {
  const values = formValues(fd)
  if (str(fd, 'website')) return { ok: true, message: 'Thanks — we’ll be in touch.' }
  const v = { name: str(fd, 'name'), email: str(fd, 'email'), phone: str(fd, 'phone'), subject: str(fd, 'subject'), message: str(fd, 'message') }
  const e: Record<string, string> = {}
  if (!v.name) e.name = 'Enter your name.'
  if (!EMAIL.test(v.email)) e.email = 'Enter a valid email so we can reply.'
  if (!v.subject) e.subject = 'Choose what this is about.'
  if (v.message.length < 10) e.message = 'Tell us a little more (at least 10 characters).'
  if (Object.keys(e).length) return { fieldErrors: e, values }
  try {
    await sendMail(
      process.env.CONTACT_TO || process.env.EMAIL_FROM || SITE.email,
      `Website enquiry: ${v.subject}`,
      emailShell(`New enquiry — ${esc(v.subject)}`, `<p><strong>${esc(v.name)}</strong> &lt;${esc(v.email)}&gt;${v.phone ? ` · ${esc(v.phone)}` : ''}</p><p style="white-space:pre-wrap">${esc(v.message)}</p>`),
      v.email,
    )
  } catch (err) {
    console.error('[contact]', err)
    return { error: `Your message didn’t send. Email us directly at ${SITE.email}.`, values }
  }
  return { ok: true, message: `Thanks, ${v.name.split(' ')[0]}. We reply within one working day.` }
}
