import { redirect } from 'next/navigation'
// The Express route; the login redirect always pointed at /hectare-solicitor/dashboard
export default function Page() { redirect('/hectare-solicitor/dashboard') }
