import { redirect } from 'next/navigation'
import { getSession, dashboardPath } from '@/lib/session'

// /dashboard sends each account to its own home
export default async function DashboardRedirect() {
  const s = await getSession()
  if (!s?.data.userId) redirect('/login?next=/dashboard')
  const path = dashboardPath(s.data.userType)
  redirect(path === '/dashboard' ? '/' : path)
}
