'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import slugify from 'slugify'
import { Models } from '@/lib/legacy'
import { requireRole } from '@/lib/guard'
import { setNotice } from '@/lib/notice'
import { sendMail, emailShell, esc } from '@/lib/mail'
import { cleanHtml } from '@/lib/sanitize'
import { type FormState, formValues, str } from '@/lib/form'
import { hasFile, type UploadInput, validateFile, saveUpload, UploadError, removeUpload } from '@/lib/uploads'

/* eslint-disable @typescript-eslint/no-explicit-any */

const TYPES = ['shortlet', 'land', 'building', 'shop', 'business_complex']
const DEALS = ['rent', 'sale', 'lease']
const VERIFICATION_FEE = 20000


async function ownProperty(id: string) {
  const v = await requireRole('property_owner')
  const p = await Models.Property.findById(id).catch(() => null)
  if (!p || String(p.owner) !== v.id) return { v, p: null as any }
  return { v, p }
}

const num = (fd: FormData, k: string, int = false) => {
  const s = str(fd, k)
  if (!s) return undefined
  const n = int ? parseInt(s, 10) : parseFloat(s)
  return Number.isFinite(n) ? n : undefined
}

/** Plain text from the editor fallback becomes paragraphs; HTML is cleaned. */
function toHtml(s: string) {
  if (/<\/?[a-z][\s\S]*>/i.test(s)) return cleanHtml(s)
  return s.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('')
}

const removeFile = removeUpload

export async function saveProperty(_p: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, 'id')
  const values = formValues(fd)
  const title = str(fd, 'title')
  const description = String(fd.get('description') || '').trim()
  const propertyType = str(fd, 'propertyType')
  const transactionType = str(fd, 'transactionType')
  const price = num(fd, 'price')
  const e: Record<string, string> = {}
  if (title.length < 10) e.title = 'Use a descriptive title of at least 10 characters.'
  if (description.replace(/<[^>]*>/g, '').trim().length < 30) e.description = 'Describe the property in at least 30 characters.'
  if (!TYPES.includes(propertyType)) e.propertyType = 'Choose a property type.'
  if (!DEALS.includes(transactionType)) e.transactionType = 'Choose sale, rent or lease.'
  if (!price || price <= 0) e.price = 'Enter the price in naira.'
  if (!str(fd, 'city')) e.city = 'Enter the city or area.'
  if (!str(fd, 'state')) e.state = 'Choose the state.'

  const newImages = fd.getAll('images').filter(hasFile) as UploadInput[]
  const remove = fd.getAll('removeImages').map(String)

  let property: any
  let v: any
  if (id) {
    const r = await ownProperty(id)
    v = r.v
    property = r.p
    if (!property) return { error: 'That property isn’t in your account.' }
    if (property.verificationStatus === 'verified') return { error: 'Verified listings can’t be edited here. Email info@revaampapa.com with the changes you need.' }
  } else {
    v = await requireRole('property_owner')
    if (!newImages.length) e.images = 'Add at least one photo.'
  }
  const keptCount = id ? property.images.filter((i: any) => !remove.includes(i.url)).length : 0
  if (keptCount + newImages.length > 15) e.images = 'Up to 15 photos per listing.'
  if (id && keptCount + newImages.length === 0) e.images = 'Keep or add at least one photo.'
  if (Object.keys(e).length) return { fieldErrors: e, values, error: 'Check the highlighted fields.' }

  try {
    newImages.forEach((f, i) => validateFile(f, 'image', 10, `Photo ${i + 1}`))
    const saved = []
    for (const f of newImages) saved.push((await saveUpload(f, 'properties', 'property')).url)

    const data = {
      title,
      description: toHtml(description),
      propertyType,
      transactionType,
      price,
      priceNegotiable: fd.get('priceNegotiable') === 'on',
      location: { address: str(fd, 'address'), city: str(fd, 'city'), state: str(fd, 'state'), lga: str(fd, 'lga'), landmark: str(fd, 'landmark') },
      features: {
        bedrooms: num(fd, 'bedrooms', true), bathrooms: num(fd, 'bathrooms', true), toilets: num(fd, 'toilets', true),
        parkingSpaces: num(fd, 'parkingSpaces', true), floorArea: num(fd, 'floorArea'), landArea: num(fd, 'landArea'),
        furnished: fd.get('furnished') === 'on', serviced: fd.get('serviced') === 'on', security: fd.get('security') === 'on',
        powerSupply: fd.get('powerSupply') === 'on', borehole: fd.get('borehole') === 'on',
      },
      videoUrl: str(fd, 'videoUrl') || undefined,
      agencyFee: (price as number) * 0.1,
    }

    if (property) {
      if (title !== property.title) property.slug = slugify(title, { lower: true, strict: true }) + '-' + Date.now()
      for (const url of remove) await removeFile(url)
      property.images = property.images.filter((i: any) => !remove.includes(i.url))
      for (const url of saved) property.images.push({ url, isPrimary: false })
      if (property.images.length && !property.images.some((i: any) => i.isPrimary)) property.images[0].isPrimary = true
      Object.assign(property, data)
      // A rejected listing goes back for review once edited
      if (property.verificationStatus === 'rejected') {
        property.verificationStatus = property.verificationPaymentConfirmed ? 'payment_confirmed' : 'pending_payment'
        property.status = property.verificationStatus
      }
      await property.save()
    } else {
      property = await new Models.Property({
        ...data,
        slug: slugify(title, { lower: true, strict: true }) + '-' + Date.now(),
        images: saved.map((url, i) => ({ url, isPrimary: i === 0 })),
        owner: v.id,
        ownerType: 'property_owner',
        listingTier: 'free',
        verificationStatus: 'pending_payment',
        status: 'pending_payment',
        verificationFee: VERIFICATION_FEE,
      }).save()
    }
  } catch (err: any) {
    if (err instanceof UploadError) return { error: err.message, values }
    console.error('[owner save]', err)
    return { error: 'The property wasn’t saved. Please try again.', values }
  }

  revalidatePath('/property-owner/dashboard')
  if (!id) {
    await setNotice('info', 'Property saved. Pay the ₦20,000 verification fee to send it for review.')
    redirect(`/property-owner/properties/pay-verification/${property._id}`)
  }
  await setNotice('success', 'Changes saved.')
  redirect(`/property-owner/properties/${property._id}`)
}

export async function deleteProperty(id: string) {
  const { p } = await ownProperty(id)
  if (!p) return
  for (const img of p.images || []) await removeFile(img.url)
  await p.deleteOne()
  revalidatePath('/property-owner/dashboard')
  await setNotice('success', `“${p.title}” was deleted.`)
  redirect('/property-owner/dashboard')
}

export async function submitVerificationPayment(_p: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, 'id')
  const { p } = await ownProperty(id)
  if (!p) return { error: 'That property isn’t in your account.' }
  if (p.verificationPaymentConfirmed) return { error: 'Payment proof for this property has already been submitted.' }
  const reference = str(fd, 'paymentReference')
  const proof = fd.get('paymentProof')
  const e: Record<string, string> = {}
  if (!reference) e.paymentReference = 'Enter the transfer reference.'
  if (!hasFile(proof)) e.paymentProof = 'Upload your receipt.'
  if (!fd.get('confirm')) e.confirm = 'Confirm you’ve made the transfer.'
  if (Object.keys(e).length) return { fieldErrors: e, values: formValues(fd) }
  try {
    validateFile(proof as UploadInput, 'document', 10, 'Receipt')
    const saved = await saveUpload(proof as UploadInput, 'payments', 'payment')
    p.verificationStatus = 'payment_confirmed'
    p.status = 'payment_confirmed'
    p.verificationPaymentReference = reference
    p.verificationPaymentDate = str(fd, 'paymentDate') ? new Date(str(fd, 'paymentDate')) : new Date()
    p.verificationPaymentConfirmed = true
    p.verificationPaymentConfirmedAt = new Date()
    p.verificationPaymentProofUrl = saved.url
    // The Express app also reads it from here
    if (!p.shortletDetails) p.shortletDetails = {}
    p.shortletDetails.verificationPaymentProofUrl = saved.url
    await p.save()
  } catch (err: any) {
    if (err instanceof UploadError) return { error: err.message }
    console.error('[owner payment]', err)
    return { error: 'The payment proof wasn’t submitted. Please try again.' }
  }
  revalidatePath('/property-owner/dashboard')
  await setNotice('success', 'Payment proof received. Our team verifies listings within 24–48 hours.')
  redirect(`/property-owner/properties/${id}`)
}

async function ownInquiry(id: string) {
  const v = await requireRole('property_owner')
  const q = await Models.Inquiry.findById(id).catch(() => null)
  if (!q || String(q.propertyOwner) !== v.id) return { v, q: null as any }
  return { v, q }
}

export async function replyToInquiry(_p: FormState, fd: FormData): Promise<FormState> {
  const { v, q } = await ownInquiry(str(fd, 'id'))
  if (!q) return { error: 'That enquiry isn’t in your account.' }
  const reply = str(fd, 'replyMessage')
  if (reply.length < 5) return { fieldErrors: { replyMessage: 'Write a reply first.' }, values: { replyMessage: reply } }
  const property = await Models.Property.findById(q.property).select('title slug')
  try {
    await sendMail(
      q.email,
      `Re: ${property?.title || 'your enquiry'} on RevaampAPA`,
      emailShell('Reply to your enquiry', `<p>Hello ${esc(q.name)},</p><p style="white-space:pre-wrap">${esc(reply)}</p>
        <p style="color:#64716e;font-size:13px;border-top:1px solid #dde3e0;padding-top:12px;margin-top:20px">${esc(v.name)} · owner of “${esc(property?.title || '')}”<br>Reply to this email to continue the conversation.</p>`),
      v.email,
    )
  } catch (err) {
    console.error('[inquiry reply]', err)
    return { error: 'Your reply couldn’t be emailed. Check your connection and try again.', values: { replyMessage: reply } }
  }
  q.replyMessage = reply
  q.repliedAt = new Date()
  q.repliedBy = v.id
  q.status = 'replied'
  q.isRead = true
  q.readAt = q.readAt || new Date()
  await q.save()
  revalidatePath('/property-owner/inquiries')
  return { ok: true, message: `Reply emailed to ${q.email}.` }
}

export async function setInquiryStatus(id: string, status: 'read' | 'archived' | 'spam' | 'new') {
  const { q } = await ownInquiry(id)
  if (!q) return
  q.status = status
  if (status !== 'new' && !q.readAt) { q.readAt = new Date(); q.isRead = true }
  await q.save()
  revalidatePath('/property-owner/inquiries')
}

export async function addInquiryNote(_p: FormState, fd: FormData): Promise<FormState> {
  const { v, q } = await ownInquiry(str(fd, 'id'))
  if (!q) return { error: 'That enquiry isn’t in your account.' }
  const note = str(fd, 'note')
  if (!note) return { fieldErrors: { note: 'Write a note first.' } }
  q.notes.push({ note, addedBy: v.id, addedAt: new Date() })
  await q.save()
  revalidatePath('/property-owner/inquiries')
  return { ok: true, message: 'Note added.' }
}
