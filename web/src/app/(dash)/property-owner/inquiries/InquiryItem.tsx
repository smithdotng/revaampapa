'use client'
import { useActionState, useState, useTransition } from 'react'
import { Mail, Phone, MessageCircle, ChevronDown } from 'lucide-react'
import { replyToInquiry, addInquiryNote, setInquiryStatus } from '@/actions/owner'
import { initialState } from '@/lib/form'
import { TextArea, SubmitButton, FormAlert } from '@/components/forms'
import { StatusPill } from '@/components/dash/ui'

/* eslint-disable @typescript-eslint/no-explicit-any */
export function InquiryItem({ q, open: initiallyOpen = false }: { q: any; open?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen)
  const [reply, replyAction] = useActionState(replyToInquiry, initialState)
  const [note, noteAction] = useActionState(addInquiryNote, initialState)
  const [pending, start] = useTransition()
  const status = reply.ok ? 'replied' : q.status
  const wa = q.phone ? `https://wa.me/${q.phone.replace(/\D/g, '').replace(/^0/, '234')}?text=${encodeURIComponent(`Hello ${q.name}, thanks for your enquiry about “${q.property?.title}” on RevaampAPA.`)}` : null
  const set = (s: 'read' | 'archived' | 'new' | 'spam') => start(() => setInquiryStatus(q._id, s))

  return (
    <li className={`${status === 'new' ? 'bg-mist/40' : ''}`}>
      <button type="button" onClick={() => { setOpen((o) => !o); if (!open && q.status === 'new') set('read') }} aria-expanded={open}
        className="flex w-full items-start gap-4 px-5 py-4 text-left hover:bg-paper/60 sm:px-6">
        <span className={`mt-2 size-2 shrink-0 rounded-full ${status === 'new' ? 'bg-teal' : 'bg-transparent'}`} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={`text-ink ${status === 'new' ? 'font-semibold' : 'font-medium'}`}>{q.name}</span>
            <StatusPill status={status} />
          </span>
          <span className="mt-0.5 block truncate text-sm text-muted">{q.property?.title || 'Property'} — {q.message}</span>
        </span>
        <span className="hidden shrink-0 text-sm text-muted sm:block">{new Date(q.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
        <ChevronDown className={`mt-1 size-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <div className="grid gap-6 border-t border-line px-5 pb-6 pt-5 sm:px-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="grid content-start gap-5">
            <blockquote className="whitespace-pre-wrap rounded-[var(--radius-sm)] bg-paper p-4 text-ink-2">{q.message}</blockquote>
            <div className="flex flex-wrap gap-2">
              <a href={`mailto:${q.email}`} className="btn btn-ghost min-h-10"><Mail className="size-4" aria-hidden /> {q.email}</a>
              {q.phone && <a href={`tel:${q.phone}`} className="btn btn-ghost min-h-10"><Phone className="size-4" aria-hidden /> {q.phone}</a>}
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-ghost min-h-10"><MessageCircle className="size-4" aria-hidden /> WhatsApp</a>}
            </div>
            {q.replyMessage && !reply.ok && (
              <div className="rounded-[var(--radius-sm)] border border-line p-4 text-sm">
                <p className="font-semibold text-ink">Your reply · {new Date(q.repliedAt).toLocaleDateString('en-GB')}</p>
                <p className="mt-1 whitespace-pre-wrap text-ink-2">{q.replyMessage}</p>
              </div>
            )}
            <form action={replyAction} className="grid gap-3">
              <input type="hidden" name="id" value={q._id} />
              <FormAlert error={reply.error} message={reply.ok ? reply.message : undefined} />
              {!reply.ok && (
                <>
                  <TextArea label={q.replyMessage ? 'Send another reply' : 'Reply by email'} name="replyMessage" rows={4} defaultValue={reply.values?.replyMessage} error={reply.fieldErrors?.replyMessage}
                    placeholder={`Hello ${q.name}, thanks for your interest…`} />
                  <SubmitButton className="btn btn-primary justify-self-start" pendingText="Sending…">Send reply</SubmitButton>
                  <p className="text-xs text-muted">Sent from RevaampAPA. Replies come straight to your email.</p>
                </>
              )}
            </form>
          </div>
          <div className="grid content-start gap-5">
            <div>
              <p className="mb-2 text-sm font-semibold">Private notes</p>
              <ul className="grid gap-2">
                {(q.notes || []).map((n: any, i: number) => (
                  <li key={i} className="rounded-[var(--radius-sm)] bg-paper px-3 py-2 text-sm text-ink-2">{n.note}<span className="mt-1 block text-xs text-muted">{new Date(n.addedAt).toLocaleDateString('en-GB')}</span></li>
                ))}
              </ul>
              <form action={noteAction} className="mt-2 flex gap-2" key={note.ok ? Date.now() : 'n'}>
                <input type="hidden" name="id" value={q._id} />
                <input name="note" placeholder="e.g. Called, inspection on Saturday" className="input min-h-10 flex-1 text-sm" aria-label="New note" />
                <SubmitButton className="btn btn-ghost min-h-10" pendingText="…">Add</SubmitButton>
              </form>
              {note.ok && <p className="mt-1 text-xs text-ok">Note saved. Refresh to see it in the list.</p>}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              {status !== 'archived' ? (
                <button type="button" disabled={pending} onClick={() => set('archived')} className="btn btn-ghost min-h-10">Archive</button>
              ) : (
                <button type="button" disabled={pending} onClick={() => set('read')} className="btn btn-ghost min-h-10">Move back to inbox</button>
              )}
              {status !== 'spam' && <button type="button" disabled={pending} onClick={() => set('spam')} className="btn btn-ghost min-h-10 text-danger">Mark as spam</button>}
              {status !== 'new' && <button type="button" disabled={pending} onClick={() => set('new')} className="btn btn-ghost min-h-10">Mark unread</button>}
            </div>
          </div>
        </div>
      )}
    </li>
  )
}
