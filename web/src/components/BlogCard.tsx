import Link from 'next/link'
import type { BlogSummary } from '@/lib/data'
import { formatDate } from '@/lib/format'
import { SmartImage } from './SmartImage'

export function BlogCard({ b, large = false }: { b: BlogSummary; large?: boolean }) {
  return (
    <article className={`group relative ${large ? 'grid gap-6 md:grid-cols-2 md:items-center' : 'flex flex-col'}`}>
      <div className={`relative overflow-hidden rounded-[var(--radius-md)] bg-mist ${large ? 'aspect-[16/10]' : 'aspect-[3/2]'}`}>
        <SmartImage src={b.featuredImage} alt="" sizes={large ? '(min-width: 768px) 600px, 100vw' : '(min-width: 1024px) 380px, 100vw'} className="transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.03]" />
      </div>
      <div className={large ? '' : 'pt-4'}>
        <p className="text-sm text-muted">{b.categories[0] && <span className="font-semibold text-teal-ink">{b.categories[0]}</span>}{b.categories[0] && <span aria-hidden> / </span>}{formatDate(b.publishedAt)} / {b.readingTime} min read</p>
        <h3 className={`mt-2 ${large ? 't-2' : 'font-sans text-lg font-semibold leading-snug tracking-normal'}`}>
          <Link href={`/blog/${b.slug}`} className="after:absolute after:inset-0">{b.title}</Link>
        </h3>
        <p className={`mt-2 text-ink-2 ${large ? '' : 'line-clamp-3 text-[0.95rem]'}`}>{b.excerpt}</p>
      </div>
    </article>
  )
}
