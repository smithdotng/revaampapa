import Link from 'next/link'
import { Mail, Phone, MessageCircle } from 'lucide-react'
import { requireRole, plain } from '@/lib/guard'
import { Models } from '@/lib/legacy'
import { earnBase, type EarnRole } from '@/lib/earn'
import { formatDate } from '@/lib/format'
import { DashHeader, Panel, EmptyState } from '@/components/dash/ui'
import { LeadStatus } from './LeadStatus'

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function EarnLeads({ role }: { role: EarnRole }) {
  const v = await requireRole(role)
  const leads = plain<any[]>(await Models.Interest.find({ promoter: v.id }).populate('property', 'title slug').sort('-createdAt').limit(200).lean())
  return (
    <>
      <DashHeader title="Leads" intro="People who enquired about a property through one of your links. The owner gets their message too — follow up to help close the deal." />
      <Panel pad={false}>
        {leads.length === 0 ? (
          <EmptyState title="No leads yet" body="Share property links and enquiries made through them will land here." action={<Link href={`${earnBase(role)}/properties`} className="btn btn-primary">Get a property link</Link>} />
        ) : (
          <ul className="divide-y divide-line">
            {leads.map((l) => {
              const wa = l.phone ? `https://wa.me/${l.phone.replace(/\D/g, '').replace(/^0/, '234')}` : null
              return (
                <li key={l._id} className="grid gap-3 px-5 py-4 sm:px-6 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="font-semibold">{l.name} <span className="font-normal text-muted">on {l.property ? <a href={`/properties/${l.property.slug}`} target="_blank" className="underline-offset-2 hover:underline">{l.property.title}</a> : 'a property'}</span></p>
                    {l.message && <p className="mt-1 line-clamp-2 text-sm text-ink-2">{l.message}</p>}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1.5 text-teal-ink hover:text-ink"><Mail className="size-4" aria-hidden />{l.email}</a>
                      {l.phone && <a href={`tel:${l.phone}`} className="inline-flex items-center gap-1.5 text-teal-ink hover:text-ink"><Phone className="size-4" aria-hidden />{l.phone}</a>}
                      {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-teal-ink hover:text-ink"><MessageCircle className="size-4" aria-hidden />WhatsApp</a>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3"><span className="text-sm text-muted">{formatDate(l.createdAt)}</span><LeadStatus id={l._id} status={l.status} /></div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </>
  )
}
