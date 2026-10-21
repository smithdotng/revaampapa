'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export function SortSelect({ value, options }: { value: string; options: [string, string][] }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      Sort
      <select
        value={value}
        onChange={(e) => {
          const q = new URLSearchParams(params.toString())
          if (e.target.value) q.set('sort', e.target.value); else q.delete('sort')
          q.delete('page')
          router.push(`${pathname}?${q.toString()}`, { scroll: false })
        }}
        className="input min-h-10 w-auto border-line bg-white py-1.5 text-sm font-medium text-ink"
      >
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  )
}
