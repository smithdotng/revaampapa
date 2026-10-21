'use server'
import { revalidatePath } from 'next/cache'
import { requireRole, type Viewer } from '@/lib/guard'
import { updateSession, type UserType } from '@/lib/session'
import { type FormState, str, formValues } from '@/lib/form'

/* eslint-disable @typescript-eslint/no-explicit-any */
const ALL: UserType[] = ['property_owner', 'promoter', 'business_partner', 'project_subscriber', 'solicitor', 'hectare_solicitor', 'architect', 'voucher_subscriber', 'superadmin']

function profileKey(type: UserType) {
  return type === 'promoter' ? 'promoterProfile' : type === 'business_partner' ? 'businessPartnerProfile' : null
}

function ensure(doc: any, key: string) {
  if (!doc[key]) doc[key] = {}
  return doc[key]
}

export async function updateProfile(_p: FormState, fd: FormData): Promise<FormState> {
  const v: Viewer = await requireRole(...ALL)
  const doc = v.doc
  const name = str(fd, 'name')
  const phone = str(fd, 'phone')
  const e: Record<string, string> = {}
  if (name.length < 2) e.name = 'Enter your full name.'
  if (phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a valid phone number.'
  if (Object.keys(e).length) return { fieldErrors: e, values: formValues(fd) }

  doc.name = name
  doc.phone = phone
  switch (v.type) {
    case 'property_owner':
      ensure(doc, 'propertyOwnerProfile').company = str(fd, 'company')
      doc.propertyOwnerProfile.address = str(fd, 'address')
      doc.propertyOwnerProfile.rcNumber = str(fd, 'rcNumber')
      break
    case 'promoter':
    case 'business_partner':
      // Registration stores social handle on promoterProfile for both types
      ensure(doc, 'promoterProfile').socialHandle = str(fd, 'socialHandle')
      break
    case 'project_subscriber':
      ensure(doc, 'projectSubscriberProfile').countryOfResidence = str(fd, 'countryOfResidence')
      doc.projectSubscriberProfile.passportNumber = str(fd, 'passportNumber')
      break
    case 'solicitor':
      doc.lawFirm = str(fd, 'lawFirm') || doc.lawFirm
      doc.territory = str(fd, 'territory') || doc.territory
      break
    case 'architect':
      doc.firm = str(fd, 'firm') || doc.firm
      doc.territory = str(fd, 'territory')
      break
    case 'voucher_subscriber':
      doc.location = { city: str(fd, 'city'), state: str(fd, 'state'), country: str(fd, 'country') || 'Nigeria' }
      break
  }
  try {
    await doc.save()
    await updateSession({ userName: doc.name })
  } catch (err: any) {
    console.error('[profile]', err)
    return { error: 'Your changes weren’t saved. Please try again.', values: formValues(fd) }
  }
  revalidatePath('/', 'layout')
  return { ok: true, message: 'Profile saved.' }
}

export async function changePassword(_p: FormState, fd: FormData): Promise<FormState> {
  const v = await requireRole(...ALL)
  const current = String(fd.get('currentPassword') || '')
  const next = String(fd.get('password') || '')
  if (!(await v.doc.comparePassword(current))) return { fieldErrors: { currentPassword: 'That isn’t your current password.' } }
  if (next.length < 8) return { fieldErrors: { password: 'Use at least 8 characters.' } }
  if (next !== fd.get('confirmPassword')) return { fieldErrors: { password: 'The two new passwords don’t match.' } }
  if (current === next) return { fieldErrors: { password: 'Choose a password different from your current one.' } }
  v.doc.password = next
  await v.doc.save()
  return { ok: true, message: 'Password changed. Use the new one next time you sign in.' }
}

export async function updateBank(_p: FormState, fd: FormData): Promise<FormState> {
  const v = await requireRole('promoter', 'business_partner')
  const bankName = str(fd, 'bankName')
  const accountNumber = str(fd, 'accountNumber').replace(/\s/g, '')
  const accountName = str(fd, 'accountName')
  const e: Record<string, string> = {}
  if (!bankName) e.bankName = 'Enter your bank.'
  if (!/^\d{10}$/.test(accountNumber)) e.accountNumber = 'NUBAN account numbers are 10 digits.'
  if (!accountName) e.accountName = 'Enter the name on the account.'
  if (Object.keys(e).length) return { fieldErrors: e, values: formValues(fd) }
  const key = profileKey(v.type)!
  ensure(v.doc, key).bankDetails = { bankName, accountNumber, accountName }
  // Keep both copies in step: the Express withdraw flow reads promoterProfile
  ensure(v.doc, 'promoterProfile').bankDetails = { bankName, accountNumber, accountName }
  await v.doc.save()
  return { ok: true, message: 'Bank details saved.' }
}
