import type { Metadata } from 'next'
import { Models } from '@/lib/legacy'
import { requireAdmin, rx, qs, PENDING } from '@/lib/admin'
import { plain } from '@/lib/guard'
import { formatDate } from '@/lib/format'
import { DashHeader, Panel, EmptyState, StatusPill, Tabs } from '@/components/dash/ui'
import { Filters } from '@/components/admin/Filters'
import { Actions, QueueItem, Facts, DocLink } from '@/components/admin/ui'
import { Act } from '@/components/admin/Act'
import { approveProfessional, rejectProfessional } from '@/actions/admin'

export const metadata: Metadata = { title: 'Professionals' }

/* eslint-disable @typescript-eslint/no-explicit-any */
type SP = { tab?: string; status?: string; q?: string }

const KINDS = {
  architects: { kind: 'architect', label: 'Partner architects', model: () => Models.Architect, profile: 'architectProfile', pending: PENDING.architect },
  solicitors: { kind: 'solicitor', label: 'Partner solicitors', model: () => Models.Solicitor, profile: 'partnerProfile', pending: PENDING.solicitor },
  hbh: { kind: 'hbh', label: 'HbH solicitors', model: () => Models.HectareSolicitor, profile: 'hectareProfile', pending: PENDING.hbh },
} as const

function stateOf(d: any, profile: string, kind: string) {
  if (d[profile]?.isActive) return 'approved'
  if (d.isSuspended || (kind === 'hbh' && d[profile]?.rejectionReason)) return 'rejected'
  return 'pending'
}

export default async function Professionals({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin()
  const sp = await searchParams
  const key = (sp.tab && sp.tab in KINDS ? sp.tab : 'architects') as keyof typeof KINDS
  const cfg = KINDS[key]
  const status = sp.status || 'pending'
  const filter: any =
    status === 'pending' ? { ...cfg.pending }
      : status === 'approved' ? { [`${cfg.profile}.isActive`]: true }
        : status === 'rejected' ? (key === 'hbh' ? { [`${cfg.profile}.isActive`]: { $ne: true }, [`${cfg.profile}.rejectionReason`]: { $nin: [null, ''] } } : { isSuspended: true, [`${cfg.profile}.isActive`]: { $ne: true } })
          : {}
  if (sp.q) filter.$or = [{ name: rx(sp.q) }, { email: rx(sp.q) }, { lawFirm: rx(sp.q) }, { firm: rx(sp.q) }]

  const [items, ...pendingCounts] = await Promise.all([
    cfg.model().find(filter).select('-password').sort('-createdAt').limit(100).lean(),
    ...Object.values(KINDS).map((k) => k.model().countDocuments(k.pending)),
  ])
  const list = plain<any[]>(items)
  const tabHref = (t: string) => `/superadmin/professionals${qs({ tab: t })}`
  const statusHref = (s: string) => `/superadmin/professionals${qs({ tab: key, status: s })}`

  return (
    <>
      <DashHeader title="Partner professionals" intro="Architects and solicitors apply with their certificates. Approve them to open their dashboards." />
      <Tabs items={Object.entries(KINDS).map(([k, c], i) => ({ label: c.label, href: tabHref(k), active: key === k, count: pendingCounts[i] }))} />
      <div className="mb-4 flex flex-wrap gap-2">
        {[['pending', 'To review'], ['approved', 'Approved'], ['rejected', 'Declined'], ['all', 'All']].map(([s, l]) => (
          <a key={s} href={statusHref(s)} aria-current={status === s ? 'page' : undefined} className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${status === s ? 'border-ink bg-ink text-white' : 'border-line-2 bg-white text-ink-2 hover:border-ink'}`}>{l}</a>
        ))}
      </div>
      <Filters search="Search name, email or firm" />
      <Panel pad={false}>
        {list.length === 0 ? <EmptyState title={status === 'pending' ? 'No applications to review' : 'Nobody here'} /> : (
          <ul className="divide-y divide-line">
            {list.map((d) => {
              const s = stateOf(d, cfg.profile, cfg.kind)
              const cert = d.arconCertificate?.url || d.barCertificate?.url
              return (
                <QueueItem key={d._id} title={d.name} aside={<StatusPill status={s} label={s === 'rejected' ? 'Declined' : undefined} />}
                  meta={`${d.email} · ${d.phone || ''} · applied ${formatDate(d.createdAt)}`}
                  actions={
                    <Actions>
                      {s !== 'approved' && <Act action={approveProfessional} id={d._id} extra={{ kind: cfg.kind }} variant="ok" label="Approve" />}
                      {s !== 'rejected' && <Act action={rejectProfessional} id={d._id} extra={{ kind: cfg.kind }} variant="danger" label={s === 'approved' ? 'Revoke' : 'Decline'} ask={[{ name: 'reason', label: 'Reason (emailed to them)', type: 'textarea' }]} submitLabel={s === 'approved' ? 'Revoke access' : 'Decline'} />}
                    </Actions>
                  }>
                  <Facts items={[
                    ['Firm', d.firm || d.lawFirm],
                    [cfg.kind === 'architect' ? 'ARCON no.' : 'Bar no.', d.arconNumber || d.barNumber],
                    ['Country', d.countryOfPractice],
                    ['Territory', d.territory],
                    ['Experience', d.experience],
                    ['Specialisms', (d.specialization || []).join(', ')],
                    ...(s === 'rejected' ? [['Reason', d.suspensionReason || d[cfg.profile]?.rejectionReason] as [string, string]] : []),
                  ]} />
                  <div className="mt-2 flex flex-wrap gap-4">
                    <DocLink url={cert} label={cfg.kind === 'architect' ? 'ARCON certificate' : 'Bar certificate'} />
                    {d.firmRegistration?.url && <DocLink url={d.firmRegistration.url} label="Firm registration" />}
                    {d.professionalProfile?.url && <DocLink url={d.professionalProfile.url} label="Professional profile" />}
                  </div>
                </QueueItem>
              )
            })}
          </ul>
        )}
      </Panel>
    </>
  )
}
