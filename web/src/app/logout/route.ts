import { destroySession } from '@/lib/session'

export async function GET() {
  await destroySession()
  return new Response(null, { status: 303, headers: { Location: '/' } })
}
export const POST = GET
