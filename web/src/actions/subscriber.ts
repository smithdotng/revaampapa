'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import slugify from 'slugify'
import { Models } from '@/lib/legacy'
import { requireRole, baseUrl } from '@/lib/guard'
import { setNotice } from '@/lib/notice'
import { type FormState, formValues, str } from '@/lib/form'
import { hasFile, type UploadInput, validateFile, saveUpload, UploadError } from '@/lib/uploads'
import { PLANS, type PlanKey } from '@/lib/plans'

/* eslint-disable @typescript-eslint/no-explicit-any */


export async function submitBankGuarantee(_p: FormState, fd: FormData): Promise<FormState> {
  const v = await requireRole('project_subscriber')
  const values = formValues(fd)
  const e: Record<string, string> = {}
  const amount = parseFloat(str(fd, 'guaranteeAmount'))
  const issue = new Date(str(fd, 'issueDate'))
  const expiry = new Date(str(fd, 'expiryDate'))
  if (!str(fd, 'bankName')) e.bankName = 'Enter the issuing bank.'
  if (!amount || amount <= 0) e.guaranteeAmount = 'Enter the guarantee amount.'
  if (!str(fd, 'referenceNumber')) e.referenceNumber = 'Enter the guarantee reference.'
  if (isNaN(+issue)) e.issueDate = 'Choose the issue date.'
  if (isNaN(+expiry)) e.expiryDate = 'Choose the expiry date.'
  else if (expiry <= new Date()) e.expiryDate = 'The guarantee has already expired.'
  const doc = fd.get('document')
  if (!hasFile(doc)) e.document = 'Upload the guarantee document.'
  if (Object.keys(e).length) return { fieldErrors: e, values }
  try {
    validateFile(doc as UploadInput, 'document', 10, 'Guarantee document')
    const saved = await saveUpload(doc as UploadInput, 'bank-guarantees', 'bank-guarantee')
    if (!v.doc.projectSubscriberProfile) v.doc.projectSubscriberProfile = {}
    v.doc.projectSubscriberProfile.bankGuarantee = {
      amount, bankName: str(fd, 'bankName'), referenceNumber: str(fd, 'referenceNumber'),
      documentUrl: saved.url, issueDate: issue, expiryDate: expiry, status: 'pending',
    }
    await v.doc.save()
  } catch (err) {
    if (err instanceof UploadError) return { error: err.message, values }
    console.error('[bank guarantee]', err)
    return { error: 'The guarantee wasn’t submitted. Please try again.', values }
  }
  revalidatePath('/project-subscriber', 'layout')
  return { ok: true, message: 'Submitted. Our team verifies bank guarantees within 2–3 business days.' }
}

export async function createProject(_p: FormState, fd: FormData): Promise<FormState> {
  const v = await requireRole('project_subscriber')
  const bg = v.doc.projectSubscriberProfile?.bankGuarantee
  if (bg?.status !== 'approved') return { error: 'Your bank guarantee must be approved before you can start a project.' }
  const values = formValues(fd)
  const e: Record<string, string> = {}
  const title = str(fd, 'title')
  const value = parseFloat(str(fd, 'projectValue'))
  const months = parseInt(str(fd, 'projectDuration'), 10)
  if (title.length < 5) e.title = 'Give the project a name.'
  if (str(fd, 'description').length < 30) e.description = 'Describe the project in at least 30 characters.'
  if (!['residential', 'commercial', 'industrial', 'infrastructure', 'renovation'].includes(str(fd, 'projectType'))) e.projectType = 'Choose a project type.'
  if (!value || value <= 0) e.projectValue = 'Enter the estimated project value.'
  if (!months || months < 1) e.projectDuration = 'Enter the duration in months.'
  if (!str(fd, 'city')) e.city = 'Enter the city.'
  if (!str(fd, 'state')) e.state = 'Enter the state.'
  if (Object.keys(e).length) return { fieldErrors: e, values }
  const project = await new Models.Project({
    title,
    slug: slugify(title, { lower: true, strict: true }) + '-' + Date.now(),
    description: str(fd, 'description'),
    projectType: str(fd, 'projectType'),
    location: { address: str(fd, 'address'), city: str(fd, 'city'), state: str(fd, 'state') },
    projectValue: value,
    projectDuration: months,
    bankGuarantee: { amount: bg.amount, bankName: bg.bankName, referenceNumber: bg.referenceNumber, documentUrl: bg.documentUrl, issueDate: bg.issueDate, expiryDate: bg.expiryDate, status: 'approved' },
    subscriber: v.id,
    serviceFee: { percentage: 10, amount: value * 0.1, paid: false },
    status: 'pending_approval',
  }).save()
  v.doc.projectSubscriberProfile.totalProjects = (v.doc.projectSubscriberProfile.totalProjects || 0) + 1
  v.doc.projectSubscriberProfile.totalProjectValue = (v.doc.projectSubscriberProfile.totalProjectValue || 0) + value
  await v.doc.save()
  await setNotice('success', 'Project submitted. Our team will review it and assign a project manager.')
  redirect(`/project-subscriber/projects/${project.slug}`)
}

/** Start a Paystack checkout for a subscription plan. */
export async function startSubscription(plan: PlanKey) {
  const v = await requireRole('project_subscriber')
  const amount = PLANS[plan]?.price
  if (!amount) return { error: 'Choose a plan.' }
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) return { error: 'Online payment isn’t set up yet. Email info@revaampapa.com to subscribe.' }
  let url: string | undefined
  try {
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: v.email,
        amount: amount * 100,
        callback_url: `${baseUrl()}/project-subscriber/subscription-callback`,
        metadata: { userId: v.id, plan, purpose: 'subscription_fee' },
      }),
    })
    const data: any = await res.json()
    url = data?.data?.authorization_url
    if (!url) throw new Error(data?.message || 'No checkout URL')
  } catch (err) {
    console.error('[paystack init]', err)
    return { error: 'We couldn’t reach Paystack. Try again in a moment.' }
  }
  redirect(url)
}
