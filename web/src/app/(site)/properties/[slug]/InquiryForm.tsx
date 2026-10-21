'use client'
import { useActionState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { sendInquiry } from './actions'
import { initialState } from '@/lib/form'
import { Field, TextArea, SubmitButton, FormAlert } from '@/components/forms'

export function InquiryForm({ propertyId, title, user, refCode }: { propertyId: string; title: string; user?: { name: string; email: string } | null; refCode?: string }) {
  const [state, action] = useActionState(sendInquiry, initialState)

  if (state.ok) {
    return (
      <div role="status" className="rounded-[var(--radius-md)] bg-ok-soft p-5 text-ok">
        <CheckCircle2 className="size-6" aria-hidden />
        <p className="mt-2 font-semibold">Message sent</p>
        <p className="mt-1 text-[0.95rem]">{state.message}</p>
      </div>
    )
  }

  const v = state.values || {}
  const e = state.fieldErrors || {}
  return (
    <form action={action} className="grid gap-4" noValidate={false}>
      <input type="hidden" name="propertyId" value={propertyId} />
      {refCode && <input type="hidden" name="ref" value={refCode} />}
      <div aria-hidden className="hidden"><input name="website" tabIndex={-1} autoComplete="off" /></div>
      <FormAlert error={state.error} />
      <Field label="Your name" name="name" required autoComplete="name" defaultValue={v.name ?? user?.name} error={e.name} />
      <Field label="Email" name="email" type="email" required autoComplete="email" defaultValue={v.email ?? user?.email} error={e.email} />
      <Field label="Phone" name="phone" type="tel" autoComplete="tel" optional defaultValue={v.phone} />
      <TextArea label="Message" name="message" rows={4} required error={e.message}
        defaultValue={v.message ?? `Hello, I’m interested in “${title}”. Is it still available, and when can I inspect it?`} />
      <SubmitButton pendingText="Sending…">Message the owner</SubmitButton>
      <p className="text-xs text-muted">Your details go only to the owner of this listing and the Revaamp team.</p>
    </form>
  )
}
