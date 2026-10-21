import { ChevronDown } from 'lucide-react'

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((f) => (
        <details key={f.q} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[1.05rem] font-semibold text-ink [&::-webkit-details-marker]:hidden">
            {f.q}
            <ChevronDown className="size-5 shrink-0 text-muted transition-transform duration-300 group-open:rotate-180" aria-hidden />
          </summary>
          <p className="max-w-[65ch] pb-6 text-ink-2">{f.a}</p>
        </details>
      ))}
    </div>
  )
}
