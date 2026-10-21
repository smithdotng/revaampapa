import Link from 'next/link'
import { LEGAL } from '@/lib/legal'

export function LegalPage({ doc }: { doc: keyof typeof LEGAL }) {
  const d = LEGAL[doc]
  const others = (['terms', 'privacy', 'cookies'] as const).filter((x) => x !== doc)
  return (
    <div className="wrap grid grid-cols-1 gap-12 py-12 md:py-16 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="On this page" className="hidden lg:block">
        <ol className="sticky top-28 grid gap-2 text-sm">
          {d.sections.map(([t], i) => (
            <li key={t}><a href={`#s${i + 1}`} className="text-muted hover:text-ink">{i + 1}. {t}</a></li>
          ))}
        </ol>
      </nav>
      <article className="max-w-[68ch]">
        <h1 className="t-1">{d.title}</h1>
        <p className="mt-3 text-sm text-muted">Last updated {d.updated}</p>
        <p className="mt-8 text-lg leading-relaxed text-ink-2">{d.intro}</p>
        {d.sections.map(([t, body], i) => (
          <section key={t} id={`s${i + 1}`} className="mt-10 scroll-mt-28">
            <h2 className="t-3">{i + 1}. {t}</h2>
            <p className="mt-3 leading-relaxed text-ink-2">{body}</p>
          </section>
        ))}
        <p className="mt-14 border-t border-line pt-6 text-sm text-muted">
          See also {others.map((o, i) => <span key={o}>{i > 0 && ' and '}<Link href={`/${o}`} className="link">{LEGAL[o].title}</Link></span>)}.
        </p>
      </article>
    </div>
  )
}
