'use server'
import { db, Models } from '@/lib/legacy'
import { getSession } from '@/lib/session'
import { sendMail, emailShell, esc } from '@/lib/mail'
import { SITE } from '@/lib/site'
import { type FormState, formValues, str, EMAIL } from '@/lib/form'

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function sendInquiry(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = formValues(fd)
  const propertyId = str(fd, 'propertyId')
  const name = str(fd, 'name')
  const email = str(fd, 'email').toLowerCase()
  const phone = str(fd, 'phone')
  const message = str(fd, 'message')

  // Honeypot: real visitors never fill this
  if (str(fd, 'website')) return { ok: true, message: 'Thanks — your message is on its way.' }

  const fieldErrors: Record<string, string> = {}
  if (!name) fieldErrors.name = 'Enter your name.'
  if (!EMAIL.test(email)) fieldErrors.email = 'Enter a valid email address so the owner can reply.'
  if (message.length < 10) fieldErrors.message = 'Add a little more detail (at least 10 characters).'
  if (Object.keys(fieldErrors).length) return { fieldErrors, values }

  try {
    await db()
    const property: any = await Models.Property.findById(propertyId).select('owner title slug')
    if (!property) return { error: 'This listing is no longer available.', values }
    const session = await getSession()
    await new Models.Inquiry({
      property: property._id,
      propertyOwner: property.owner,
      name, email, phone, message,
      user: session?.data.userId || null,
      status: 'new',
      isRead: false,
    }).save()

    // Credit the promoter whose link brought this visitor (link code or the /r/ session)
    const code = str(fd, 'ref') || (session?.data.referringPromoter as any)?.referralCode
    if (code) {
      const promo = await Models.Promotion.findOne({ referralCode: code, property: property._id })
      if (promo) {
        await new Models.Interest({ promotion: promo._id, property: property._id, promoter: promo.promoter, name, email, phone, message, status: 'new' }).save()
        await Models.Promotion.updateOne({ _id: promo._id }, { $inc: { inquiries: 1 } })
      }
    }

    // Let the owner know
    const owner: any = await Models.User.findById(property.owner).select('name email')
    if (owner?.email) {
      void sendMail(
        owner.email,
        `New enquiry: ${property.title}`,
        emailShell('You have a new enquiry', `<p>Hello ${esc(owner.name || '')},</p><p><strong>${esc(name)}</strong> asked about “${esc(property.title)}”:</p>
          <blockquote style="border-left:3px solid #03a6a6;margin:0;padding:4px 14px;white-space:pre-wrap">${esc(message)}</blockquote>
          <p style="margin:24px 0"><a href="${SITE.url}/property-owner/inquiries" style="background:#1e2326;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">Reply from your dashboard</a></p>`),
        email,
      ).catch((err) => console.error('[inquiry notify]', err))
    }
    return { ok: true, message: `Sent. The owner of “${property.title}” will reply to ${email}.` }
  } catch (err) {
    console.error('[inquiry]', err)
    return { error: 'Your message didn’t send. Check your connection and try again.', values }
  }
}
