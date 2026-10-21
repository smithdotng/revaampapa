import { redirect } from 'next/navigation'

// Old Express URL — transactions now sit on the promoter's page
export default async function Old({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/superadmin/promoters/${(await params).id}`)
}
