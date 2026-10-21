import type { Metadata } from 'next'
import { requireRole, plain } from '@/lib/guard'
import { DashHeader, Panel } from '@/components/dash/ui'
import { KpiForm } from './KpiForm'

export const metadata: Metadata = { title: 'KPIs' }

export default async function Kpis() {
  const v = await requireRole('solicitor')
  return (
    <>
      <DashHeader title="KPIs" intro="Keep your numbers current. The Revaamp team reviews them each quarter." />
      <Panel><KpiForm k={plain(v.doc.partnerProfile?.kpiMetrics || {})} /></Panel>
    </>
  )
}
