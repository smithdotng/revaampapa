'use client'
import { useActionState } from 'react'
import { sendContact } from './actions'
import { initialState } from '@/lib/form'
import { Field, TextArea, Select, SubmitButton, FormAlert } from '@/components/forms'

export function ContactForm() {
  const [s, action] = useActionState(sendContact, initialState)
  if (s.ok) return <FormAlert message={s.message} />
  const v = s.values || {}
  const e = s.fieldErrors || {}
  return (
    <form action={action} className="grid gap-5">
      <div aria-hidden className="hidden"><input name="website" tabIndex={-1} autoComplete="off" /></div>
      <FormAlert error={s.error} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" name="name" required autoComplete="name" defaultValue={v.name} error={e.name} />
        <Field label="Email" name="email" type="email" required autoComplete="email" defaultValue={v.email} error={e.email} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Phone" name="phone" type="tel" optional autoComplete="tel" defaultValue={v.phone} />
        <Select label="What’s it about?" name="subject" required defaultValue={v.subject} error={e.subject}
          options={['Property listing', 'Promoter registration', 'Business partnership', 'Partner hotels & Room Voucher', 'Project management', 'Technical support', 'Something else']} />
      </div>
      <TextArea label="Message" name="message" required rows={6} defaultValue={v.message} error={e.message} />
      <SubmitButton pendingText="Sending…" className="btn btn-primary justify-self-start">Send message</SubmitButton>
    </form>
  )
}
