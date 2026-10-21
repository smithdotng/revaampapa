import type { Metadata } from 'next'
import { requireRole, plain } from '@/lib/guard'
import { naira, formatDate } from '@/lib/format'
import { DashHeader, Panel, StatusPill, KeyValue } from '@/components/dash/ui'
import { GuaranteeForm } from './GuaranteeForm'

export const metadata: Metadata = { title: 'Bank guarantee' }

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function BankGuarantee() {
  const v = await requireRole('project_subscriber')
  const bg: any = plain(v.doc.projectSubscriberProfile?.bankGuarantee || null)
  const has = bg?.referenceNumber
  return (
    <>
      <DashHeader title="Bank guarantee" intro="A guarantee from your bank secures construction finance and lets milestone work start without upfront payment." />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <Panel title="Current guarantee" action={has && <StatusPill status={bg.status} label={bg.status === 'pending' ? 'Being verified' : undefined} />}>
          {has ? (
            <>
              <KeyValue items={[['Bank', bg.bankName], ['Amount', naira(bg.amount)], ['Reference', bg.referenceNumber], ['Issued', formatDate(bg.issueDate)], ['Expires', formatDate(bg.expiryDate)],
                ['Document', bg.documentUrl ? <a key="d" href={bg.documentUrl} className="link" target="_blank">Download</a> : '—']]} />
              {bg.status === 'pending' && <p className="mt-5 text-sm text-ink-2">Verification takes 2–3 business days. We’ll email you when it’s done.</p>}
              {bg.status === 'rejected' && <p className="mt-5 text-sm text-danger">This guarantee wasn’t accepted. Submit a new one, or email info@revaampapa.com for the reason.</p>}
            </>
          ) : <p className="text-ink-2">You haven’t submitted one yet.</p>}
        </Panel>
        <Panel title={has ? 'Replace it' : 'Submit your guarantee'} intro={has ? 'Submitting a new one replaces the current guarantee and restarts verification.' : undefined}>
          <GuaranteeForm />
        </Panel>
      </div>
    </>
  )
}
