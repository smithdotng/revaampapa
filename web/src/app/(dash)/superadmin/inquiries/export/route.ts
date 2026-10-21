import { Models } from '@/lib/legacy'
import { requireAdmin, inquiryQuery } from '@/lib/admin'

/* eslint-disable @typescript-eslint/no-explicit-any */

const cell = (v: unknown) => {
  const s = v === undefined || v === null ? '' : String(v)
  // Quote everything; neutralise spreadsheet formulas
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`
}

export async function GET(req: Request) {
  await requireAdmin()
  const p = new URL(req.url).searchParams
  const query = inquiryQuery({ status: p.get('status') || '', q: p.get('q') || '', from: p.get('from') || '', to: p.get('to') || '' })
  const rows = (await Models.Inquiry.find(query).populate('property', 'title slug').populate('propertyOwner', 'name email').sort('-createdAt').limit(20000).lean()) as any[]
  const head = ['Date', 'Name', 'Email', 'Phone', 'Property', 'Owner', 'Owner email', 'Status', 'Message', 'Reply']
  const lines = [head.map(cell).join(',')]
  for (const r of rows) {
    lines.push([
      new Date(r.createdAt).toISOString().slice(0, 16).replace('T', ' '),
      r.name, r.email, r.phone, r.property?.title, r.propertyOwner?.name, r.propertyOwner?.email, r.status, r.message, r.replyMessage,
    ].map(cell).join(','))
  }
  const name = `revaampapa-enquiries-${new Date().toISOString().slice(0, 10)}.csv`
  return new Response('﻿' + lines.join('\r\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' },
  })
}
