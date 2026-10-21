import { NextResponse, type NextRequest } from 'next/server'

/** Lets pages know where the visitor was headed (used for ?next= after sign-in). */
export function proxy(req: NextRequest) {
  const headers = new Headers(req.headers)
  headers.set('x-rv-path', req.nextUrl.pathname + req.nextUrl.search)
  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/|favicon|icon|brand/|uploads/|api/).*)',
      missing: [{ type: 'header', key: 'next-action' }],
    },
  ],
}
