'use server'
import { redirect } from 'next/navigation'
import { db, Models, sendLegacyEmail } from '@/lib/legacy'
import { setNotice } from '@/lib/notice'
import { type FormState, formValues, str, EMAIL, NG_PHONE, INTL_PHONE } from '@/lib/form'
import { hasFile, type UploadInput, validateFile, saveUpload, UploadError } from '@/lib/uploads'

/* eslint-disable @typescript-eslint/no-explicit-any */

type Errors = Record<string, string>

/**
 * Every account type signs in through one form that checks these collections
 * in order, so an email must be unique across all of them — otherwise the
 * later account could never sign in.
 */
const ACCOUNT_MODELS = ['User', 'Solicitor', 'HectareSolicitor', 'Architect', 'PartnerHotel', 'VoucherSubscriber']

async function emailTaken(email: string) {
  for (const m of ACCOUNT_MODELS) if (await (Models as any)[m].exists({ email })) return true
  return false
}

function base(fd: FormData, phone: 'ng' | 'intl' | 'any' = 'any') {
  const v = {
    name: str(fd, 'name'),
    email: str(fd, 'email').toLowerCase(),
    phone: str(fd, 'phone'),
    password: String(fd.get('password') || ''),
  }
  const e: Errors = {}
  if (v.name.length < 2) e.name = 'Enter your full name.'
  if (!EMAIL.test(v.email)) e.email = 'Enter a valid email address.'
  const compactPhone = v.phone.replace(/[\s-]/g, '')
  if (!v.phone) e.phone = 'Enter a phone number.'
  else if (phone === 'ng' && !NG_PHONE.test(compactPhone)) e.phone = 'Use a Nigerian mobile number, e.g. 08012345678 or +2348012345678.'
  else if (phone === 'intl' && !INTL_PHONE.test(v.phone)) e.phone = 'Enter a valid phone number, including the country code if outside Nigeria.'
  else if (phone === 'any' && compactPhone.length < 10) e.phone = 'Enter a valid phone number.'
  if (phone === 'ng' && !e.phone) v.phone = compactPhone
  if (v.password.length < 8) e.password = 'Use at least 8 characters.'
  else if (v.password !== fd.get('confirmPassword')) e.password = 'The two passwords don’t match.'
  return { v, e }
}

async function guard(fd: FormData, e: Errors, email: string): Promise<FormState | null> {
  const values = formValues(fd)
  if (!fd.get('terms')) e.terms = 'Please accept the terms to continue.'
  if (Object.keys(e).length) return { fieldErrors: e, values, error: 'Check the highlighted fields.' }
  await db()
  if (await emailTaken(email)) {
    return { fieldErrors: { email: 'An account already uses this email. Sign in, or use a different email.' }, values }
  }
  return null
}

function failure(err: any, fd: FormData): FormState {
  const values = formValues(fd)
  if (err instanceof UploadError) return { error: err.message, values }
  if (err?.code === 11000) return { fieldErrors: { email: 'An account already uses this email.' }, values }
  if (err?.name === 'ValidationError') {
    return { error: 'Some details weren’t accepted: ' + Object.values(err.errors).map((x: any) => x.message).join(', '), values }
  }
  console.error('[register]', err)
  return { error: 'Your registration didn’t go through. Please try again.', values }
}

/** Resolve ?ref= from promoter/partner links: PROMO-<id>, a raw user id, or a unique link code. */
async function referrerFrom(ref: string) {
  if (!ref) return null
  const id = ref.startsWith('PROMO-') ? ref.slice(6) : ref
  try {
    if (/^[0-9a-f]{24}$/i.test(id)) return await Models.User.findById(id).select('_id userType')
    return await Models.User.findOne({ $or: [{ 'promoterProfile.uniqueLink': ref }, { 'businessPartnerProfile.uniqueLink': ref }, { 'businessPartnerProfile.referralCode': ref }, { 'promoterProfile.referralCode': ref }] }).select('_id userType')
  } catch {
    return null
  }
}

/** Record who brought this person in, so it shows in the referrer's dashboard. */
async function creditReferral(ref: string, referredId: unknown, type: 'promoter' | 'business_partner') {
  const referrer = await referrerFrom(ref)
  if (!referrer || String(referrer._id) === String(referredId)) return
  try {
    await new Models.Referral({
      referrer: referrer._id,
      referred: referredId,
      type,
      referralCode: ref,
      ...(type === 'business_partner' ? { commissionAmount: 10000 } : { commissionRate: 70 }),
      status: 'pending',
    }).save()
    await Models.ReferralClick.updateOne({ referrer: referrer._id, referralCode: ref, converted: false }, { $set: { converted: true, convertedAt: new Date(), registeredUserId: referredId } })
  } catch (err) {
    console.error('[referral credit]', err)
  }
}

async function done(message: string): Promise<never> {
  await setNotice('success', message)
  redirect('/login')
}

/* ───────────── Property owner (free; pays ₦20,000 per listing) ───────────── */
export async function registerOwner(_p: FormState, fd: FormData): Promise<FormState> {
  const { v, e } = base(fd, 'ng')
  try {
    const stop = await guard(fd, e, v.email)
    if (stop) return stop
    const newsletter = fd.get('newsletter') === 'on'
    const user = await new Models.User({
      ...v,
      userType: 'property_owner',
      propertyOwnerProfile: { company: str(fd, 'company'), rcNumber: str(fd, 'rcNumber'), verified: false, totalProperties: 0, totalPropertiesValue: 0 },
      preferences: { emailInquiries: true, emailTransactions: true, weeklyNewsletter: newsletter, marketingEmails: newsletter },
    }).save()
    await sendLegacyEmail('sendWelcomeEmailToPropertyOwner', user)
  } catch (err) {
    return failure(err, fd)
  }
  return done('Account created. Sign in to list your first property — the ₦20,000 verification fee is only due when you list.')
}

/* ───────────── Promoter (free, auto-approved) ───────────── */
export async function registerPromoter(_p: FormState, fd: FormData): Promise<FormState> {
  const { v, e } = base(fd, 'ng')
  try {
    const stop = await guard(fd, e, v.email)
    if (stop) return stop
    const user = new Models.User({
      ...v,
      userType: 'promoter',
      promoterProfile: {
        isApproved: true,
        registrationDate: new Date(),
        socialHandle: str(fd, 'socialHandle'),
        experience: str(fd, 'experience'),
        totalEarnings: 0,
        pendingWithdrawal: 0,
      },
      preferences: { emailInquiries: true, emailTransactions: true, weeklyNewsletter: false, marketingEmails: false },
    })
    if (typeof user.generateUniqueLink === 'function') user.generateUniqueLink()
    await user.save()
    await creditReferral(str(fd, 'ref'), user._id, 'promoter')
    await sendLegacyEmail('sendWelcomeEmailToPromoter', user)
  } catch (err) {
    return failure(err, fd)
  }
  return done('You’re a Revaamp promoter. Sign in to get your referral links and start sharing.')
}

/* ───────────── Business partner (₦20,000, proof of payment) ───────────── */
export async function registerBusinessPartner(_p: FormState, fd: FormData): Promise<FormState> {
  const { v, e } = base(fd, 'ng')
  const ref = str(fd, 'paymentReference')
  const receipt = fd.get('paymentProof')
  if (!ref) e.paymentReference = 'Enter the reference from your transfer.'
  if (!hasFile(receipt)) e.paymentProof = 'Upload your payment receipt.'
  try {
    if (hasFile(receipt)) validateFile(receipt, 'document', 10, 'Payment receipt')
    const stop = await guard(fd, e, v.email)
    if (stop) return stop
    const saved = await saveUpload(receipt as UploadInput, 'payments', 'payment')
    const paymentDate = str(fd, 'paymentDate') ? new Date(str(fd, 'paymentDate')) : new Date()
    // Payment fields live on businessPartnerProfile: promoterProfile has no such
    // fields in the schema, so Mongoose silently dropped them on the old site.
    const partner = await new Models.User({
      ...v,
      userType: 'business_partner',
      promoterProfile: {
        isApproved: false,
        registrationDate: new Date(),
        socialHandle: str(fd, 'socialHandle'),
        experience: str(fd, 'experience'),
        totalEarnings: 0,
        pendingWithdrawal: 0,
      },
      businessPartnerProfile: {
        isApproved: false,
        registrationDate: new Date(),
        socialHandle: str(fd, 'socialHandle'),
        experience: str(fd, 'experience'),
        paymentStatus: 'pending',
        paymentReference: ref,
        paymentAmount: 20000,
        paymentDate,
        paymentProofUrl: saved.url,
      },
    }).save()
    await creditReferral(str(fd, 'ref'), partner._id, 'business_partner')
  } catch (err) {
    return failure(err, fd)
  }
  return done('Application received. We’ll verify your ₦20,000 payment and email you when your partner dashboard is ready.')
}

/* ───────────── Project management subscriber ───────────── */
export async function registerProjectSubscriber(_p: FormState, fd: FormData): Promise<FormState> {
  const { v, e } = base(fd, 'intl')
  const country = str(fd, 'countryOfResidence')
  if (!country) e.countryOfResidence = 'Choose your country of residence.'
  try {
    const stop = await guard(fd, e, v.email)
    if (stop) return stop
    await new Models.User({
      ...v,
      userType: 'project_subscriber',
      projectSubscriberProfile: {
        isApproved: false,
        subscriptionStatus: 'inactive',
        countryOfResidence: country,
        passportNumber: str(fd, 'passportNumber'),
        totalProjects: 0,
        totalProjectValue: 0,
      },
    }).save()
  } catch (err) {
    return failure(err, fd)
  }
  return done('Account created. Sign in to complete your subscription.')
}

/* ───────────── Partner solicitor (10+ years) ───────────── */
export async function registerSolicitor(_p: FormState, fd: FormData): Promise<FormState> {
  const { v, e } = base(fd, 'intl')
  const f = {
    lawFirm: str(fd, 'lawFirm'),
    barNumber: str(fd, 'barNumber'),
    countryOfPractice: str(fd, 'countryOfPractice'),
    territory: str(fd, 'territory'),
    years: parseInt(str(fd, 'yearsOfPractice'), 10) || 0,
    areas: str(fd, 'experience'),
  }
  if (!f.lawFirm) e.lawFirm = 'Enter your law firm.'
  if (!f.barNumber) e.barNumber = 'Enter your bar or enrolment number.'
  if (!f.countryOfPractice) e.countryOfPractice = 'Choose the country you practise in.'
  if (!f.territory) e.territory = 'Enter the state or region you’ll cover.'
  if (f.years < 10) e.yearsOfPractice = 'Partner Solicitors need at least 10 years of practice. With fewer, apply as an HbH Solicitor.'
  const files = { barCertificate: fd.get('barCertificate'), firmRegistration: fd.get('firmRegistration'), professionalProfile: fd.get('professionalProfile') }
  try {
    for (const [k, file] of Object.entries(files)) if (hasFile(file)) validateFile(file, 'document', 10, k === 'barCertificate' ? 'Bar certificate' : k === 'firmRegistration' ? 'Firm registration' : 'Professional profile')
    const stop = await guard(fd, e, v.email)
    if (stop) return stop
    const docs: Record<string, { url: string; filename?: string; uploadedAt: Date }> = {}
    for (const [k, file] of Object.entries(files)) {
      const s = hasFile(file) ? await saveUpload(file, 'documents', k) : { url: '', filename: undefined }
      docs[k] = { url: s.url, filename: s.filename, uploadedAt: new Date() }
    }
    await new Models.Solicitor({
      ...v,
      lawFirm: f.lawFirm,
      barNumber: f.barNumber,
      countryOfPractice: f.countryOfPractice,
      territory: f.territory,
      // The Express app parses years out of this text, so lead with the number
      experience: `${f.years} years${f.areas ? ` — ${f.areas}` : ''}`,
      ...docs,
      partnerProfile: { isActive: false, mandateAccepted: true, mandateAcceptedAt: new Date(), yearsOfPractice: f.years },
    }).save()
  } catch (err) {
    return failure(err, fd)
  }
  return done('Application submitted. Our team will review it and email you once you’re approved.')
}

/* ───────────── HbH solicitor (no minimum experience; documents optional) ───────────── */
export async function registerHbhSolicitor(_p: FormState, fd: FormData): Promise<FormState> {
  const { v, e } = base(fd, 'any')
  const barNumber = str(fd, 'barNumber')
  const countryOfPractice = str(fd, 'countryOfPractice')
  if (!barNumber) e.barNumber = 'Enter your bar or enrolment number.'
  if (!countryOfPractice) e.countryOfPractice = 'Choose the country you practise in.'
  const files = { barCertificate: fd.get('barCertificate'), professionalProfile: fd.get('professionalProfile') }
  try {
    for (const [k, file] of Object.entries(files)) if (hasFile(file)) validateFile(file, 'document', 10, k === 'barCertificate' ? 'Bar certificate' : 'Professional profile')
    const stop = await guard(fd, e, v.email)
    if (stop) return stop
    const docs: Record<string, { url: string; filename: string; uploadedAt: Date }> = {}
    for (const [k, file] of Object.entries(files)) {
      const s = hasFile(file) ? await saveUpload(file, 'documents', k) : { url: '', filename: '' }
      docs[k] = { url: s.url, filename: s.filename, uploadedAt: new Date() }
    }
    await new Models.HectareSolicitor({
      ...v,
      barNumber,
      countryOfPractice,
      ...docs,
      hectareProfile: { isActive: false, registeredAt: new Date() },
    }).save()
  } catch (err) {
    return failure(err, fd)
  }
  return done('Application submitted. We’ll email you when your HbH Solicitor account is approved.')
}

/* ───────────── Partner architect ───────────── */
export async function registerArchitect(_p: FormState, fd: FormData): Promise<FormState> {
  const { v, e } = base(fd, 'intl')
  const f = {
    firm: str(fd, 'firm'),
    arconNumber: str(fd, 'arconNumber'),
    countryOfPractice: str(fd, 'countryOfPractice'),
    territory: str(fd, 'territory'),
    experience: str(fd, 'experience'),
    specialization: fd.getAll('specialization').map(String).filter(Boolean),
  }
  if (!f.firm) e.firm = 'Enter your practice or firm name.'
  if (!f.arconNumber) e.arconNumber = 'Enter your ARCON or national registration number.'
  if (!f.countryOfPractice) e.countryOfPractice = 'Choose the country you practise in.'
  const files = { arconCertificate: fd.get('arconCertificate'), firmRegistration: fd.get('firmRegistration'), professionalProfile: fd.get('professionalProfile') }
  try {
    for (const [, file] of Object.entries(files)) if (hasFile(file)) validateFile(file, 'document', 10, 'Document')
    const stop = await guard(fd, e, v.email)
    if (stop) return stop
    const docs: Record<string, { url: string; filename?: string; uploadedAt: Date }> = {}
    for (const [k, file] of Object.entries(files)) {
      const s = hasFile(file) ? await saveUpload(file, 'documents', k) : { url: '', filename: undefined }
      docs[k] = { url: s.url, filename: s.filename, uploadedAt: new Date() }
    }
    await new Models.Architect({
      ...v,
      ...f,
      ...docs,
      architectProfile: { isActive: false, mandateAccepted: true, mandateAcceptedAt: new Date() },
    }).save()
  } catch (err) {
    return failure(err, fd)
  }
  return done('Application submitted. Our team will review your registration and email you once approved.')
}

/* ───────────── Partner hotel (no login; notified by email) ───────────── */
async function resolveReferrer(code: string) {
  if (!code) return null
  try {
    return await Models.User.findOne({
      $or: [
        { 'promoterProfile.uniqueLink': code },
        { 'promoterProfile.uniqueLinks.code': code },
        { 'businessPartnerProfile.uniqueLink': code },
        { 'businessPartnerProfile.uniqueLinks.code': code },
      ],
    })
  } catch {
    return null
  }
}

export async function registerPartnerHotel(_p: FormState, fd: FormData): Promise<FormState> {
  const { v, e } = base(fd, 'any')
  const h = {
    hotelName: str(fd, 'hotelName'),
    description: str(fd, 'description'),
    city: str(fd, 'city'),
    state: str(fd, 'state'),
  }
  if (!h.hotelName) e.hotelName = 'Enter the hotel’s name.'
  if (h.description.length < 30) e.description = 'Describe the hotel in a few sentences (at least 30 characters).'
  if (!h.city) e.city = 'Enter the city.'
  if (!h.state) e.state = 'Enter the state or region.'

  const images = fd.getAll('images').filter(hasFile) as UploadInput[]
  const docs = { cacCertificate: fd.get('cacCertificate'), hotelLicence: fd.get('hotelLicence'), ratePolicy: fd.get('ratePolicy') }
  if (images.length > 10) e.images = 'Upload up to 10 photos.'

  const names = fd.getAll('roomTypeName').map(String)
  const prices = fd.getAll('roomTypePrice').map(String)
  const counts = fd.getAll('roomTypeCount').map(String)
  const roomTypes = names
    .map((name, i) => ({ name: name.trim(), price: parseFloat(prices[i]) || 0, totalRooms: parseInt(counts[i], 10) || 0 }))
    .filter((r) => r.name)

  try {
    images.forEach((f, i) => validateFile(f, 'image', 10, `Photo ${i + 1}`))
    for (const [, file] of Object.entries(docs)) if (hasFile(file)) validateFile(file, 'document', 10, 'Document')
    const stop = await guard(fd, e, v.email)
    if (stop) return stop

    const savedImages = []
    for (let i = 0; i < images.length; i++) {
      const s = await saveUpload(images[i], 'hotels', 'hotel')
      savedImages.push({ url: s.url, isPrimary: i === 0 })
    }
    const savedDocs: Record<string, { url: string; filename: string; uploadedAt: Date }> = {}
    for (const [k, file] of Object.entries(docs)) {
      const s = hasFile(file) ? await saveUpload(file, 'documents', k) : { url: '', filename: '' }
      savedDocs[k] = { url: s.url, filename: s.filename, uploadedAt: new Date() }
    }
    const ref = str(fd, 'ref')
    const referrer = await resolveReferrer(ref)
    await new Models.PartnerHotel({
      ...v,
      position: str(fd, 'position'),
      hotelName: h.hotelName,
      description: h.description,
      starRating: parseFloat(str(fd, 'starRating')) || 0,
      numberOfRooms: parseInt(str(fd, 'numberOfRooms'), 10) || 0,
      yearEstablished: parseInt(str(fd, 'yearEstablished'), 10) || undefined,
      website: str(fd, 'website'),
      location: { address: str(fd, 'address'), city: h.city, state: h.state, country: str(fd, 'country') || 'Nigeria' },
      roomTypes,
      amenities: fd.getAll('amenities').map(String),
      images: savedImages,
      ...savedDocs,
      partnerProfile: {
        isActive: false,
        mandateAccepted: true,
        mandateAcceptedAt: new Date(),
        referredByCode: ref || undefined,
        onboardedByPromoter: referrer?._id,
      },
    }).save()
  } catch (err) {
    return failure(err, fd)
  }
  // Partner hotels have no sign-in area, so don't send them to /login
  await setNotice('success', 'Application submitted. We’ll review your hotel and email you as soon as a decision is made — approved hotels are published to the directory.')
  redirect('/hotels')
}
