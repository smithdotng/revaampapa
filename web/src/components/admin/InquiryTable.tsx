'use client'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle } from 'lucide-react'
import { toast } from '@/components/NoticeToast'
import { StatusPill } from '@/components/dash/ui'
import { setInquiriesStatus, deleteInquiries } from '@/actions/admin'

type Row = { _id: string; name: string; email: string; phone?: string; message: string; status: string; createdAt: string; property?: { title?: string; slug?: string } | null; owner?: string }

/** Enquiries table with row selection and bulk status changes. */
export function InquiryTable({ rows }: { rows: Row[] }) {
  const [sel, setSel] = useState<string[]>([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pending, start] = useTransition()
  const router = useRouter()
  const all = rows.length > 0 && sel.length === rows.length
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const run = (fn: typeof setInquiriesStatus, extra: Record<string, string> = {}) => {
    const fd = new FormData()
    sel.forEach((id) => fd.append('ids', id))
    for (const [k, v] of Object.entries(extra)) fd.set(k, v)
    start(async () => {
      const r = await fn(fd)
      if (r?.error) return toast('error', r.error)
      toast('success', r?.message || 'Done.')
      setSel([])
      setConfirmDelete(false)
      router.refresh()
    })
  }

  return (
    <>
      <div className="flex min-h-14 flex-wrap items-center gap-2 border-b border-line px-5 py-2.5 sm:px-6">
        <label className="mr-2 inline-flex items-center gap-2 text-sm font-medium text-ink-2">
          <input type="checkbox" className="size-4 accent-[var(--color-lagoon)]" checked={all} onChange={() => setSel(all ? [] : rows.map((r) => r._id))} aria-label="Select all on this page" />
          {sel.length ? `${sel.length} selected` : 'Select'}
        </label>
        {sel.length > 0 && (confirmDelete ? (
          <>
            <span className="text-sm text-ink-2">Delete {sel.length} enquir{sel.length === 1 ? 'y' : 'ies'} for good?</span>
            <button type="button" disabled={pending} onClick={() => run(deleteInquiries)} className="btn min-h-9 bg-danger px-3 text-sm text-white">Delete</button>
            <button type="button" disabled={pending} onClick={() => setConfirmDelete(false)} className="btn btn-ghost min-h-9 px-3 text-sm">Cancel</button>
          </>
        ) : (
          <>
            {[['read', 'Mark read'], ['replied', 'Mark replied'], ['archived', 'Archive'], ['spam', 'Spam']].map(([s, l]) => (
              <button key={s} type="button" disabled={pending} onClick={() => run(setInquiriesStatus, { status: s })} className="btn btn-ghost min-h-9 px-3 text-sm">{l}</button>
            ))}
            <button type="button" disabled={pending} onClick={() => setConfirmDelete(true)} className="btn btn-ghost min-h-9 px-3 text-sm text-danger">Delete</button>
          </>
        ))}
        {pending && <LoaderCircle className="size-4 animate-spin text-muted" aria-label="Working" />}
      </div>
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r._id} className={`flex gap-3 px-5 py-4 sm:px-6 ${r.status === 'new' ? 'bg-teal/[0.04]' : ''}`}>
            <input type="checkbox" className="mt-1 size-4 shrink-0 accent-[var(--color-lagoon)]" checked={sel.includes(r._id)} onChange={() => toggle(r._id)} aria-label={`Select enquiry from ${r.name}`} />
            <Link href={`/superadmin/inquiries/${r._id}`} className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className={`text-ink ${r.status === 'new' ? 'font-bold' : 'font-semibold'}`}>{r.name}</span>
                <span className="text-sm text-muted">{r.phone || r.email}</span>
                <StatusPill status={r.status} />
                <span className="ml-auto text-sm text-muted">{new Date(r.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <p className="mt-0.5 truncate text-sm font-medium text-teal-ink">{r.property?.title || 'Property removed'}{r.owner && <span className="font-normal text-muted"> · owner {r.owner}</span>}</p>
              <p className="mt-1 line-clamp-2 text-[0.925rem] text-ink-2">{r.message}</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
