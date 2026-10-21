import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Pagination({ page, pages, base, params }: { page: number; pages: number; base: string; params: Record<string, string | undefined> }) {
  if (pages <= 1) return null
  const href = (p: number) => {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v)
    if (p > 1) q.set('page', String(p)); else q.delete('page')
    const s = q.toString()
    return s ? `${base}?${s}` : base
  }
  const nums: (number | '…')[] = []
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i)
    else if (nums[nums.length - 1] !== '…') nums.push('…')
  }
  const cell = 'grid h-11 min-w-11 place-items-center rounded-full px-3 text-sm font-semibold'
  return (
    <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={href(page - 1)} className={`${cell} border border-line-2 hover:border-ink`} aria-label="Previous page"><ChevronLeft className="size-4" /></Link>
      ) : <span className={`${cell} border border-line text-line-2`} aria-hidden><ChevronLeft className="size-4" /></span>}
      {nums.map((n, i) =>
        n === '…' ? <span key={`e${i}`} className="px-1 text-muted">…</span> : (
          <Link key={n} href={href(n)} aria-current={n === page ? 'page' : undefined}
            className={`${cell} ${n === page ? 'bg-ink text-white' : 'text-ink-2 hover:bg-white'}`}>{n}</Link>
        ),
      )}
      {page < pages ? (
        <Link href={href(page + 1)} className={`${cell} border border-line-2 hover:border-ink`} aria-label="Next page"><ChevronRight className="size-4" /></Link>
      ) : <span className={`${cell} border border-line text-line-2`} aria-hidden><ChevronRight className="size-4" /></span>}
    </nav>
  )
}
