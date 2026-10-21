import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Mail, Phone } from 'lucide-react'
import { Models, mongoose } from '@/lib/legacy'
import { requireAdmin } from '@/lib/admin'
import { plain } from '@/lib/guard'
import { formatDate, naira } from '@/lib/format'
import { DashHeader, Panel, StatusPill, KeyValue } from '@/components/dash/ui'
import { Actions } from '@/components/admin/ui'
import { Act } from '@/components/admin/Act'
import { setInquiriesStatus, deleteInquiries, replyToInquiryAdmin, addInquiryNoteAdmin } from '@/actions/admin'

export const metadata: Metadata = { title: 'Enquiry' }

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function InquiryDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  if (!mongoose.isValidObjectId(id)) notFound()
  const doc = await Models.Inquiry.findById(id)
    .populate('property', 'title slug price location listedBySuperadmin externalOwner')
    .populate('propertyOwner', 'name email phone')
    .populate('notes.addedBy', 'name')
    .populate('repliedBy', 'name')
  if (!doc) notFound()
  // Opening a new enquiry marks it read
  if (doc.status === 'new') {
    doc.status = 'read'
    doc.isRead = true
    doc.readAt = new Date()
    await doc.save()
  }
  const q = plain<any>(doc.toObject())
  const p = q.property
  const owner = p?.listedBySuperadmin ? p.externalOwner : q.propertyOwner
  const status = (s: string, label: string) => q.status !== s && <Act action={setInquiriesStatus} extra={{ ids: q._id, status: s }} label={label} />

  return (
    <>
      <DashHeader back={{ label: '← Enquiries', href: '/superadmin/inquiries' }} title={`Enquiry from ${q.name}`} intro={`Received ${formatDate(q.createdAt)}`}
        actions={<Actions>
          {status('archived', 'Archive')}
          {status('spam', 'Mark as spam')}
          <Act action={deleteInquiries} extra={{ ids: q._id, back: '1' }} variant="danger" label="Delete" confirm="Delete this enquiry for good?" submitLabel="Delete enquiry" />
        </Actions>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="grid content-start gap-6">
          <Panel title="Message" action={<StatusPill status={q.status} />}>
            <p className="whitespace-pre-wrap text-[1.02rem] leading-relaxed text-ink">{q.message}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href={`mailto:${q.email}`} className="btn btn-ghost min-h-10 px-4 text-sm"><Mail className="size-4" aria-hidden /> {q.email}</a>
              {q.phone && <a href={`tel:${q.phone}`} className="btn btn-ghost min-h-10 px-4 text-sm"><Phone className="size-4" aria-hidden /> {q.phone}</a>}
              {q.phone && <a href={`https://wa.me/${q.phone.replace(/\D/g, '').replace(/^0/, '234')}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost min-h-10 px-4 text-sm">WhatsApp</a>}
            </div>
          </Panel>
          {q.replyMessage ? (
            <Panel title="Reply sent" intro={`${q.repliedBy?.name ? `By ${q.repliedBy.name}, ` : ''}${formatDate(q.repliedAt)}`}>
              <p className="whitespace-pre-wrap text-ink-2">{q.replyMessage}</p>
            </Panel>
          ) : (
            <Panel title="Reply by email" intro={p?.listedBySuperadmin ? 'This listing has no owner account, so the buyer is waiting on you.' : 'The owner can reply from their dashboard; reply here if they haven’t.'}>
              <Act action={replyToInquiryAdmin} id={q._id} variant="primary" label="Write a reply" ask={[{ name: 'reply', label: `Reply to ${q.name}`, type: 'textarea', required: true }]} submitLabel="Send reply" />
            </Panel>
          )}
          <Panel title="Notes" intro="Only visible to the Revaamp team and the owner.">
            {q.notes?.length ? (
              <ul className="mb-4 grid gap-3">
                {q.notes.map((n: any) => (
                  <li key={n._id} className="rounded-[var(--radius-sm)] bg-paper px-4 py-3 text-sm">
                    <p className="whitespace-pre-wrap text-ink">{n.note}</p>
                    <p className="mt-1 text-xs text-muted">{n.addedBy?.name || 'Team'} · {formatDate(n.addedAt)}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="mb-4 text-sm text-muted">No notes yet.</p>}
            <Act action={addInquiryNoteAdmin} id={q._id} label="Add a note" ask={[{ name: 'note', label: 'Note', type: 'textarea', required: true }]} submitLabel="Save note" />
          </Panel>
        </div>
        <div className="grid content-start gap-6">
          <Panel title="Property">
            {p ? (
              <>
                <Link href={`/superadmin/properties/${p._id}`} className="font-semibold text-ink hover:text-teal-ink">{p.title}</Link>
                <p className="mt-1 text-sm text-muted">{[p.location?.city, p.location?.state].filter(Boolean).join(', ')} · {naira(p.price)}</p>
                <Link href={`/properties/${p.slug}`} target="_blank" className="mt-3 inline-block text-sm font-semibold text-teal-ink hover:text-ink">View public page</Link>
              </>
            ) : <p className="text-sm text-muted">The property has been removed.</p>}
          </Panel>
          <Panel title={p?.listedBySuperadmin ? 'Owner (offline listing)' : 'Owner'}>
            {owner ? <KeyValue items={[['Name', owner.name], ['Phone', owner.phone || '—'], ['Email', owner.email || '—']]} /> : <p className="text-sm text-muted">Unknown</p>}
          </Panel>
        </div>
      </div>
    </>
  )
}
