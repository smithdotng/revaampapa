'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { db, Models, sendLegacyEmail } from '@/lib/legacy'
import { getSession, updateSession } from '@/lib/session'
import { setNotice } from '@/lib/notice'
import { type FormState, formValues, str, EMAIL } from '@/lib/form'

/* eslint-disable @typescript-eslint/no-explicit-any */

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** The subscriber behind this visit: signed in, or confirmed on the hotels page. */
export async function currentSubscriber(): Promise<any | null> {
  const s = await getSession()
  if (!s) return null
  await db()
  if (s.data.userType === 'voucher_subscriber' && s.data.userId) return Models.VoucherSubscriber.findById(s.data.userId)
  if (s.data.voucherMode?.id) return Models.VoucherSubscriber.findById(s.data.voucherMode.id)
  return null
}

async function resolveReferrer(ref: string) {
  if (!ref) return null
  const or: Record<string, string>[] = [
    { 'promoterProfile.uniqueLink': ref },
    { 'promoterProfile.uniqueLinks.code': ref },
    { 'businessPartnerProfile.uniqueLink': ref },
    { 'businessPartnerProfile.uniqueLinks.code': ref },
  ]
  if (/^[0-9a-fA-F]{24}$/.test(ref)) or.unshift({ _id: ref })
  try { return await Models.User.findOne({ $or: or }) } catch { return null }
}

// "Are you a Room Voucher subscriber?" on /hotels
export async function checkSubscriber(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, 'identifier')
  if (!id) return { error: 'Enter the email or membership number on your subscription.' }
  try {
    await db()
    const q = id.includes('@') ? { email: id.toLowerCase() } : { subscriberCode: id.toUpperCase() }
    const sub = await Models.VoucherSubscriber.findOne(q)
    if (!sub) return { error: 'We couldn’t find that subscription. Check the details, or subscribe below.', values: { identifier: id } }
    if (!sub.hasActiveSubscription()) {
      await updateSession({ voucherMode: null })
      return { error: `Your subscription is ${sub.subscription?.status || 'not active'}. It must be active before you can register a stay — email info@revaampapa.com.`, values: { identifier: id } }
    }
    await updateSession({ voucherMode: { id: String(sub._id), code: sub.subscriberCode, name: sub.name } })
  } catch (err) {
    console.error('[voucher check]', err)
    return { error: 'We couldn’t check your subscription just now. Try again in a moment.' }
  }
  revalidatePath('/hotels')
  await setNotice('success', 'Membership confirmed. Cashback rates are shown on every hotel — register your stay before check-in to claim.')
  redirect('/hotels')
}

export async function exitVoucherMode() {
  await updateSession({ voucherMode: null })
  revalidatePath('/hotels')
  redirect('/hotels')
}

export async function reserveStay(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = formValues(fd)
  const slug = str(fd, 'slug')
  const sub = await currentSubscriber()
  if (!sub || !sub.hasActiveSubscription()) return { error: 'An active Room Voucher subscription is required to register a stay.' }
  const hotel = await Models.Hotel.findOne({ slug, isActive: true })
  if (!hotel) return { error: 'This hotel is no longer listed.' }

  const guestName = str(fd, 'guestName')
  const checkIn = new Date(str(fd, 'checkInDate'))
  const checkOut = new Date(str(fd, 'checkOutDate'))
  const fieldErrors: Record<string, string> = {}
  if (!guestName) fieldErrors.guestName = 'Enter the name the booking is under.'
  if (isNaN(+checkIn)) fieldErrors.checkInDate = 'Choose a check-in date.'
  if (isNaN(+checkOut)) fieldErrors.checkOutDate = 'Choose a check-out date.'
  else if (!isNaN(+checkIn) && checkOut <= checkIn) fieldErrors.checkOutDate = 'Check-out must be after check-in.'
  // Registration must come before the stay — no retroactive claims
  if (!isNaN(+checkIn) && checkIn < startOfToday()) fieldErrors.checkInDate = 'Stays must be registered before check-in. Cashback can’t be claimed for past dates.'
  const guestEmail = str(fd, 'guestEmail')
  if (guestEmail && !EMAIL.test(guestEmail)) fieldErrors.guestEmail = 'Enter a valid email or leave it blank.'
  if (Object.keys(fieldErrors).length) return { fieldErrors, values }

  let reservation: any
  try {
    reservation = await new Models.RoomVoucherReservation({
      subscriber: sub._id,
      hotel: hotel._id,
      hotelName: hotel.name,
      guestName,
      guestEmail: guestEmail || sub.email || '',
      guestPhone: str(fd, 'guestPhone') || sub.phone || '',
      roomType: str(fd, 'roomType'),
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfRooms: parseInt(str(fd, 'numberOfRooms'), 10) || 1,
      numberOfGuests: parseInt(str(fd, 'numberOfGuests'), 10) || 1,
      roomRate: parseFloat(str(fd, 'roomRate')) || 0,
      voucherDiscountRate: hotel.voucherDiscountRate || 0, // snapshot at registration
      specialRequests: str(fd, 'specialRequests'),
      status: 'registered',
      cashbackStatus: 'pending',
    }).save()
  } catch (err) {
    console.error('[voucher reserve]', err)
    return { error: 'The stay wasn’t registered. Please try again.', values }
  }
  await sendLegacyEmail('sendVoucherReservationRegisteredEmail', sub, reservation, hotel)
  await setNotice('success', `Stay registered at ${hotel.name}. Reference ${reservation.reference}. Cashback is calculated once the stay is confirmed.`)
  const s = await getSession()
  redirect(s?.data.userType === 'voucher_subscriber' ? `/voucher/reservations/${reservation._id}` : `/hotels/${slug}`)
}

export async function registerSubscriber(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = formValues(fd)
  const name = str(fd, 'name')
  const email = str(fd, 'email').toLowerCase()
  const phone = str(fd, 'phone')
  const password = String(fd.get('password') || '')
  const fieldErrors: Record<string, string> = {}
  if (!name) fieldErrors.name = 'Enter your full name.'
  if (!EMAIL.test(email)) fieldErrors.email = 'Enter a valid email address.'
  if (!phone) fieldErrors.phone = 'Enter a phone number.'
  if (password.length < 8) fieldErrors.password = 'Use at least 8 characters.'
  else if (password !== fd.get('confirmPassword')) fieldErrors.password = 'The two passwords don’t match.'
  if (Object.keys(fieldErrors).length) return { fieldErrors, values }

  let sub: any
  try {
    await db()
    if (await Models.VoucherSubscriber.findOne({ email })) {
      return { fieldErrors: { email: 'This email is already subscribed. Sign in instead.' }, values }
    }
    const ref = str(fd, 'ref')
    const referrer = await resolveReferrer(ref)
    sub = await new Models.VoucherSubscriber({
      name,
      email,
      phone,
      password,
      location: { city: str(fd, 'city'), state: str(fd, 'state'), country: str(fd, 'country') || 'Nigeria' },
      subscription: { status: 'pending' },
      referral: {
        referredByCode: ref || undefined,
        referredBy: referrer?._id,
        referrerType: referrer ? (referrer.userType === 'business_partner' ? 'business_partner' : 'promoter') : 'none',
        commissionStatus: referrer ? 'pending' : 'not_applicable',
      },
    }).save()
  } catch (err: any) {
    console.error('[voucher register]', err)
    if (err?.code === 11000) return { fieldErrors: { email: 'This email is already subscribed.' }, values }
    return { error: 'Your subscription didn’t go through. Please try again.', values }
  }
  await sendLegacyEmail('sendVoucherSubscriptionReceivedEmail', sub)
  await setNotice('success', `Subscription received. Your membership number is ${sub.subscriberCode}. We’ll email you when it’s active, then you can register stays for cashback.`)
  redirect('/login')
}
