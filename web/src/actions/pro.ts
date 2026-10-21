'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Models } from '@/lib/legacy'
import { requireRole } from '@/lib/guard'
import { setNotice } from '@/lib/notice'
import { type FormState, formValues, str } from '@/lib/form'
import { hasFile, type UploadInput, validateFile, saveUpload, UploadError, fileName } from '@/lib/uploads'

/* eslint-disable @typescript-eslint/no-explicit-any */
const n = (fd: FormData, k: string) => Math.max(0, parseInt(str(fd, k), 10) || 0)

export async function updateKpis(_p: FormState, fd: FormData): Promise<FormState> {
  const v = await requireRole('solicitor')
  await Models.Solicitor.updateOne({ _id: v.id }, {
    $set: {
      'partnerProfile.kpiMetrics.transactionsInitiated': n(fd, 'transactionsInitiated'),
      'partnerProfile.kpiMetrics.promotersOnboarded': n(fd, 'promotersOnboarded'),
      'partnerProfile.kpiMetrics.cooperativeSocietiesEstablished': n(fd, 'cooperativeSocieties'),
    },
  })
  revalidatePath('/solicitor', 'layout')
  return { ok: true, message: 'KPIs updated.' }
}

const TEXT = ['projectLocation', 'promoterName', 'proposedUse', 'siteConditions', 'foundationAssessment', 'structuralDesignReview', 'materialsAssessment', 'loadBearingEvaluation', 'complianceWithCodes', 'identifiedRisks', 'recommendations', 'remarks', 'conditions']

export async function submitAssessment(_p: FormState, fd: FormData): Promise<FormState> {
  const v = await requireRole('architect')
  if (!v.doc.architectProfile?.isActive) return { error: 'Your account must be approved before you can submit reports.' }
  const values = formValues(fd)
  const e: Record<string, string> = {}
  const projectTitle = str(fd, 'projectTitle')
  const rating = str(fd, 'structuralIntegrityRating')
  const recommendation = str(fd, 'recommendation')
  if (projectTitle.length < 3) e.projectTitle = 'Enter the project title.'
  if (!['excellent', 'good', 'fair', 'poor'].includes(rating)) e.structuralIntegrityRating = 'Choose a rating.'
  if (!['approved', 'approved_with_conditions', 'rejected'].includes(recommendation)) e.recommendation = 'Choose your recommendation.'
  if (recommendation === 'approved_with_conditions' && !str(fd, 'conditions')) e.conditions = 'List the conditions.'
  if (str(fd, 'siteConditions').length < 10) e.siteConditions = 'Describe the site conditions.'
  const files = fd.getAll('supportingDocuments').filter(hasFile) as UploadInput[]
  if (files.length > 8) e.supportingDocuments = 'Up to 8 files.'
  if (Object.keys(e).length) return { fieldErrors: e, values, error: 'Check the highlighted fields.' }
  let id: string
  try {
    files.forEach((f, i) => validateFile(f, 'document', 15, `File ${i + 1}`))
    const docs = []
    for (const f of files) docs.push({ name: fileName(f), url: (await saveUpload(f, 'documents', 'assessment')).url, uploadedAt: new Date() })
    const data: Record<string, any> = { architect: v.id, projectTitle, structuralIntegrityRating: rating, recommendation, supportingDocuments: docs, status: 'submitted', submittedAt: new Date() }
    for (const k of TEXT) data[k] = str(fd, k)
    const a = await new Models.StructuralAssessment(data).save()
    id = String(a._id)
    await Models.Architect.updateOne({ _id: v.id }, { $inc: { 'architectProfile.kpiMetrics.assessmentsSubmitted': 1 } })
  } catch (err) {
    if (err instanceof UploadError) return { error: err.message, values }
    console.error('[assessment]', err)
    return { error: 'The report wasn’t submitted. Please try again.', values }
  }
  await setNotice('success', 'Structural assessment report submitted.')
  redirect(`/architect/assessment/${id}`)
}

export async function cancelReservation(id: string) {
  const v = await requireRole('voucher_subscriber')
  const r = await Models.RoomVoucherReservation.findOne({ _id: id, subscriber: v.id })
  if (!r || !['registered', 'confirmed'].includes(r.status)) return { error: 'This reservation can no longer be cancelled.' }
  r.status = 'cancelled'
  r.cancelledAt = new Date()
  await r.save()
  revalidatePath('/voucher', 'layout')
  await setNotice('success', `Reservation ${r.reference} cancelled.`)
  return { ok: true }
}
