'use server'
import slugify from 'slugify'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { Models, mongoose, sendLegacyEmail } from '@/lib/legacy'
import { requireAdmin } from '@/lib/admin'
import { setNotice } from '@/lib/notice'
import { toHtml } from '@/lib/sanitize'
import { type FormState, formValues, str } from '@/lib/form'
import { hasFile, type UploadInput, validateFile, saveUpload, removeUpload, UploadError } from '@/lib/uploads'
import { AMENITIES } from '@/lib/format'

/* eslint-disable @typescript-eslint/no-explicit-any */

const TYPES = ['shortlet', 'land', 'building', 'shop', 'business_complex']
const DEALS = ['rent', 'sale', 'lease']
const BLOG_CATEGORIES = ['Market News', 'Buying Guide', 'Selling Tips', 'Renting Advice', 'Investment', 'Legal Guide', 'Agent Tips', 'Property Spotlight', 'Industry Insights']

const num = (fd: FormData, k: string, int = false) => {
  const s = str(fd, k)
  if (!s) return undefined
  const n = int ? parseInt(s, 10) : parseFloat(s)
  return Number.isFinite(n) ? n : undefined
}
const textLength = (html: string) => html.replace(/<[^>]*>/g, '').trim().length
const lines = (fd: FormData, k: string) => String(fd.get(k) || '').split('\n').map((l) => l.trim()).filter(Boolean)

async function uploadAll(files: UploadInput[], dir: string, prefix: string) {
  files.forEach((f, i) => validateFile(f, 'image', 10, `Photo ${i + 1}`))
  const out: string[] = []
  for (const f of files) out.push((await saveUpload(f, dir, prefix)).url)
  return out
}

function mergeImages(current: any[], remove: string[], added: string[]) {
  const images = current.filter((i: any) => !remove.includes(i.url))
  for (const url of added) images.push({ url, isPrimary: false })
  if (images.length && !images.some((i: any) => i.isPrimary)) images[0].isPrimary = true
  return images
}

/* ───────── Property (list on behalf of an owner, or edit any listing) ───────── */

export async function saveAdminProperty(_p: FormState, fd: FormData): Promise<FormState> {
  const v = await requireAdmin()
  const id = str(fd, 'id')
  const values = formValues(fd)
  const title = str(fd, 'title')
  const description = String(fd.get('description') || '').trim()
  const propertyType = str(fd, 'propertyType')
  const transactionType = str(fd, 'transactionType')
  const price = num(fd, 'price')
  const e: Record<string, string> = {}
  if (title.length < 5) e.title = 'Enter a descriptive title.'
  if (textLength(description) < 10) e.description = 'Add a description.'
  if (!TYPES.includes(propertyType)) e.propertyType = 'Choose a property type.'
  if (!DEALS.includes(transactionType)) e.transactionType = 'Choose sale, rent or lease.'
  if (!price || price <= 0) e.price = 'Enter the price in naira.'
  if (!str(fd, 'city')) e.city = 'Enter the city or area.'
  if (!str(fd, 'state')) e.state = 'Choose the state.'

  let property: any = null
  if (id) {
    if (!mongoose.isValidObjectId(id)) return { error: 'That property wasn’t found.' }
    property = await Models.Property.findById(id)
    if (!property) return { error: 'That property wasn’t found. It may have been deleted.' }
  }
  const external = !property || property.listedBySuperadmin
  if (external) {
    if (!str(fd, 'ownerName')) e.ownerName = 'Enter the owner’s name.'
    if (!str(fd, 'ownerPhone')) e.ownerPhone = 'Enter the owner’s phone number.'
  }
  const newImages = fd.getAll('images').filter(hasFile) as UploadInput[]
  const remove = fd.getAll('removeImages').map(String)
  const kept = property ? property.images.filter((i: any) => !remove.includes(i.url)).length : 0
  if (kept + newImages.length === 0) e.images = 'Add at least one photo.'
  if (kept + newImages.length > 15) e.images = 'Up to 15 photos per listing.'
  if (Object.keys(e).length) return { fieldErrors: e, values, error: 'Check the highlighted fields.' }

  try {
    const added = await uploadAll(newImages, 'properties', 'property')
    const data: any = {
      title,
      description: toHtml(description),
      propertyType,
      transactionType,
      price,
      priceNegotiable: fd.get('priceNegotiable') === 'on',
      location: { address: str(fd, 'address'), city: str(fd, 'city'), state: str(fd, 'state'), lga: str(fd, 'lga'), landmark: str(fd, 'landmark') },
      features: {
        bedrooms: num(fd, 'bedrooms', true) ?? 0, bathrooms: num(fd, 'bathrooms', true) ?? 0, toilets: num(fd, 'toilets', true) ?? 0,
        parkingSpaces: num(fd, 'parkingSpaces', true) ?? 0, floorArea: num(fd, 'floorArea') ?? 0, landArea: num(fd, 'landArea') ?? 0,
        furnished: fd.get('furnished') === 'on', serviced: fd.get('serviced') === 'on', security: fd.get('security') === 'on',
        powerSupply: fd.get('powerSupply') === 'on', borehole: fd.get('borehole') === 'on',
      },
      videoUrl: str(fd, 'videoUrl') || undefined,
      agencyFee: (price as number) * 0.1,
    }
    if (external) {
      data.externalOwner = { name: str(fd, 'ownerName'), phone: str(fd, 'ownerPhone'), email: str(fd, 'ownerEmail'), address: str(fd, 'ownerAddress') }
    }

    if (property) {
      if (title !== property.title) property.slug = slugify(title, { lower: true, strict: true }) + '-' + Date.now()
      for (const url of remove) await removeUpload(url)
      property.images = mergeImages(property.images, remove, added)
      Object.assign(property, data)
      const vs = str(fd, 'verificationStatus')
      if (['pending_payment', 'payment_confirmed', 'verification_pending', 'verified', 'rejected'].includes(vs)) property.verificationStatus = vs
      const st = str(fd, 'status')
      if (['pending_payment', 'payment_confirmed', 'pending_verification', 'available', 'sold', 'rented', 'unavailable', 'rejected'].includes(st)) property.status = st
      const featured = fd.get('featured') === 'on'
      if (featured !== !!property.featured) {
        property.featured = featured
        property.featuredExpiry = featured ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null
      }
      await property.save()
    } else {
      property = await new Models.Property({
        ...data,
        slug: slugify(title, { lower: true, strict: true }) + '-' + Date.now(),
        images: added.map((url, i) => ({ url, isPrimary: i === 0 })),
        owner: v.id,
        ownerType: 'superadmin',
        listedBySuperadmin: true,
        verificationStatus: 'verified',
        status: 'available',
        verificationPaymentConfirmed: true,
        verificationPaymentConfirmedBy: v.id,
        verificationPaymentConfirmedAt: new Date(),
      }).save()
    }
  } catch (err: any) {
    if (err instanceof UploadError) return { error: err.message, values }
    console.error('[admin property]', err)
    return { error: 'The listing wasn’t saved. Please try again.', values }
  }
  revalidatePath('/superadmin', 'layout')
  revalidatePath('/properties')
  revalidatePath('/')
  await setNotice('success', id ? 'Listing updated.' : `“${title}” is live, listed for ${str(fd, 'ownerName')}.`)
  redirect(`/superadmin/properties/${property._id}`)
}

/* ───────── Hotels ───────── */

export async function saveHotel(_p: FormState, fd: FormData): Promise<FormState> {
  const v = await requireAdmin()
  const id = str(fd, 'id')
  const values = formValues(fd)
  const name = str(fd, 'name')
  const description = String(fd.get('description') || '').trim()
  const e: Record<string, string> = {}
  if (name.length < 2) e.name = 'Enter the hotel’s name.'
  if (textLength(description) < 10) e.description = 'Describe the hotel.'
  if (!str(fd, 'city')) e.city = 'Enter the city.'
  const commissionRate = num(fd, 'commissionRate') ?? 30
  const voucherDiscountRate = num(fd, 'voucherDiscountRate') ?? 0
  if (commissionRate < 0 || commissionRate > 100) e.commissionRate = 'Use a percentage between 0 and 100.'
  if (voucherDiscountRate < 0 || voucherDiscountRate > 100) e.voucherDiscountRate = 'Use a percentage between 0 and 100.'
  const rating = Math.max(0, Math.min(5, num(fd, 'rating') ?? 0))

  let hotel: any = null
  if (id) {
    if (!mongoose.isValidObjectId(id)) return { error: 'That hotel wasn’t found.' }
    hotel = await Models.Hotel.findById(id)
    if (!hotel) return { error: 'That hotel wasn’t found. It may have been deleted.' }
  }
  const newImages = fd.getAll('images').filter(hasFile) as UploadInput[]
  const remove = fd.getAll('removeImages').map(String)
  if (Object.keys(e).length) return { fieldErrors: e, values, error: 'Check the highlighted fields.' }

  try {
    const added = await uploadAll(newImages, 'hotels', 'hotel')
    const data = {
      name,
      description: toHtml(description),
      location: { address: str(fd, 'address'), city: str(fd, 'city'), state: str(fd, 'state'), country: str(fd, 'country') || 'Nigeria' },
      contactInfo: { phone: str(fd, 'phone'), email: str(fd, 'email'), website: str(fd, 'website') },
      commissionRate,
      voucherDiscountRate,
      amenities: fd.getAll('amenities').map(String).filter((a) => a in AMENITIES),
      featured: fd.get('featured') === 'on',
      rating,
      isActive: fd.get('isActive') === 'on',
    }
    if (hotel) {
      // Files may be shared with the partner application, so only the reference is dropped
      hotel.images = mergeImages(hotel.images, remove, added)
      Object.assign(hotel, data)
      await hotel.save()
    } else {
      hotel = await new Models.Hotel({ ...data, images: added.map((url, i) => ({ url, isPrimary: i === 0 })), createdBy: v.id }).save()
    }
  } catch (err: any) {
    if (err instanceof UploadError) return { error: err.message, values }
    console.error('[admin hotel]', err)
    return { error: 'The hotel wasn’t saved. Please try again.', values }
  }
  revalidatePath('/superadmin/hotels')
  revalidatePath('/hotels')
  await setNotice('success', id ? `${name} updated.` : `${name} added.`)
  redirect('/superadmin/hotels')
}

/* ───────── Blog ───────── */

export async function saveBlog(_p: FormState, fd: FormData): Promise<FormState> {
  const v = await requireAdmin()
  const id = str(fd, 'id')
  const values = formValues(fd)
  const title = str(fd, 'title')
  const excerpt = str(fd, 'excerpt')
  const content = String(fd.get('content') || '').trim()
  const status = ['draft', 'published', 'archived'].includes(str(fd, 'status')) ? str(fd, 'status') : 'draft'
  const image = fd.get('featuredImage')
  const e: Record<string, string> = {}
  if (title.length < 5) e.title = 'Enter a title.'
  if (excerpt.length < 20) e.excerpt = 'Write a short summary of at least 20 characters.'
  if (excerpt.length > 300) e.excerpt = 'Keep the summary under 300 characters.'
  if (textLength(content) < 50) e.content = 'The post needs some content.'

  let blog: any = null
  if (id) {
    if (!mongoose.isValidObjectId(id)) return { error: 'That post wasn’t found.' }
    blog = await Models.Blog.findById(id)
    if (!blog) return { error: 'That post wasn’t found. It may have been deleted.' }
  } else if (!hasFile(image)) {
    e.featuredImage = 'Add a featured image.'
  }
  if (Object.keys(e).length) return { fieldErrors: e, values, error: 'Check the highlighted fields.' }

  try {
    let featuredImage: string | undefined
    if (hasFile(image)) {
      validateFile(image, 'image', 5, 'Featured image')
      featuredImage = (await saveUpload(image, 'blogs', 'blog')).url
    }
    const data: any = {
      title,
      excerpt,
      content: toHtml(content),
      categories: fd.getAll('categories').map(String).filter((c) => BLOG_CATEGORIES.includes(c)),
      tags: str(fd, 'tags').split(',').map((t) => t.trim()).filter(Boolean),
      metaTitle: str(fd, 'metaTitle') || title,
      metaDescription: str(fd, 'metaDescription') || excerpt,
      metaKeywords: str(fd, 'metaKeywords'),
      featured: fd.get('featured') === 'on',
      status,
    }
    if (blog) {
      if (status === 'published' && blog.status !== 'published') data.publishedAt = new Date()
      if (featuredImage) {
        await removeUpload(blog.featuredImage)
        data.featuredImage = featuredImage
        data.ogImage = featuredImage
      }
      Object.assign(blog, data)
      blog.updatedAt = new Date()
      await blog.save()
    } else {
      blog = await new Models.Blog({
        ...data,
        featuredImage,
        ogImage: featuredImage,
        author: v.id,
        authorName: v.name,
        publishedAt: status === 'published' ? new Date() : null,
      }).save()
    }
  } catch (err: any) {
    if (err instanceof UploadError) return { error: err.message, values }
    console.error('[admin blog]', err)
    return { error: 'The post wasn’t saved. Please try again.', values }
  }
  revalidatePath('/superadmin/blogs')
  revalidatePath('/blog')
  revalidatePath(`/blog/${blog.slug}`)
  await setNotice('success', status === 'published' ? `“${title}” is published.` : `“${title}” saved as ${status}.`)
  redirect('/superadmin/blogs')
}

/* ───────── Bid notices ───────── */

export async function saveBidNotice(_p: FormState, fd: FormData): Promise<FormState> {
  const v = await requireAdmin()
  const values = formValues(fd)
  const e: Record<string, string> = {}
  const need = (k: string, msg: string) => { if (!str(fd, k)) e[k] = msg }
  need('transactionNumber', 'Enter the transaction number.')
  need('client', 'Enter the client.')
  need('description', 'Describe the transaction.')
  const n = (k: string) => Number(str(fd, k))
  for (const [k, label] of [['totalLots', 'number of lots'], ['transactionPricePerLot', 'price per lot'], ['transactionCostPerLot', 'cost per lot'], ['profitPerLot', 'profit per lot']]) {
    if (!(n(k) >= 0) || str(fd, k) === '') e[k] = `Enter the ${label}.`
  }
  if (!(n('totalLots') >= 1)) e.totalLots = 'Offer at least one lot.'
  const deadline = new Date(str(fd, 'deadline'))
  if (Number.isNaN(deadline.getTime())) e.deadline = 'Set the bidding deadline.'
  else if (deadline.getTime() < Date.now()) e.deadline = 'The deadline must be in the future.'
  if (Object.keys(e).length) return { fieldErrors: e, values, error: 'Check the highlighted fields.' }

  let notice: any
  try {
    notice = await new Models.BidNotice({
      title: str(fd, 'title') || 'BID NOTICE TO REVAAMP VALUE PARTNERS',
      description: str(fd, 'description'),
      transactionNumber: str(fd, 'transactionNumber'),
      client: str(fd, 'client'),
      totalLots: n('totalLots'),
      transactionPricePerLot: n('transactionPricePerLot'),
      transactionCostPerLot: n('transactionCostPerLot'),
      profitPerLot: n('profitPerLot'),
      deadline,
      deadlineText: str(fd, 'deadlineText'),
      paymentDays: n('paymentDays') || 2,
      paymentToPartnerDays: n('paymentToPartnerDays') || 9,
      conditions: lines(fd, 'conditions'),
      allocationCriteria: lines(fd, 'allocationCriteria'),
      importantNotes: lines(fd, 'importantNotes'),
      status: 'active',
      createdBy: v.id,
    }).save()
  } catch (err) {
    console.error('[bid notice]', err)
    return { error: 'The bid notice wasn’t created. Please try again.', values }
  }

  const emailAll = fd.get('emailAll') === 'on'
  if (emailAll) {
    const noticeId = String(notice._id)
    // Runs after the response is sent (Vercel keeps the function alive for it)
    after(async () => {
      try {
        const doc = await Models.BidNotice.findById(noticeId)
        if (!doc) return
        const users = await Models.User.find({ email: { $exists: true, $ne: '' }, isSuspended: { $ne: true } }, 'name email userType').lean()
        let sent = 0
        for (const u of users) if (await sendLegacyEmail('sendBidNoticeEmail', u, doc)) sent++
        console.log(`[bid notice] ${doc.transactionNumber}: emailed ${sent}/${users.length}`)
      } catch (err) {
        console.error('[bid notice broadcast]', err)
      }
    })
  }
  revalidatePath('/superadmin/bid-notices')
  revalidatePath('/business-partner/bid')
  await setNotice('success', `Bid notice ${notice.transactionNumber} is open${emailAll ? ' and being emailed to all users' : ''}.`)
  redirect(`/superadmin/bid-notices/${notice._id}`)
}
