import type { Metadata } from 'next'
import Link from 'next/link'
import { listBlogs } from '@/lib/data'
import { BlogCard } from '@/components/BlogCard'
import { Pagination } from '@/components/Pagination'

export const metadata: Metadata = { title: 'Blog — real estate insights for Nigeria', description: 'Buying guides, legal checklists, market news and promoter tips from the Revaamp team.' }

type SP = Promise<Record<string, string | string[] | undefined>>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined

export default async function BlogPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const f = { category: one(sp.category), q: one(sp.search) || one(sp.q), page: Number(one(sp.page)) || 1 }
  const res = await listBlogs(f)
  const [lead, ...rest] = res.items
  const showLead = lead && f.page === 1 && !f.category && !f.q

  return (
    <>
      <section className="wrap pb-8 pt-12 md:pt-16">
        <h1 className="t-1">The Revaamp blog</h1>
        <p className="lede mt-3">Practical guides on buying, selling, documents and earning as a promoter.</p>
        {res.categories.length > 0 && (
          <nav aria-label="Categories" className="mt-8 flex flex-wrap gap-2">
            <Link href="/blog" aria-current={!f.category ? 'page' : undefined} className="rounded-full border border-line-2 bg-white px-4 py-2 text-sm font-medium aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-white">All</Link>
            {res.categories.map((c) => (
              <Link key={c.name} href={`/blog?category=${encodeURIComponent(c.name)}`} aria-current={f.category === c.name ? 'page' : undefined}
                className="rounded-full border border-line-2 bg-white px-4 py-2 text-sm font-medium aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-white">
                {c.name} <span className="opacity-60">{c.count}</span>
              </Link>
            ))}
          </nav>
        )}
      </section>
      <section className="wrap pb-20">
        {res.items.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-line-2 px-6 py-16 text-center">
            <h2 className="t-2">No articles here yet</h2>
            <p className="mt-2 text-ink-2">New guides are on the way.</p>
            <Link href="/properties" className="btn btn-primary mt-6">Browse properties instead</Link>
          </div>
        ) : (
          <>
            {showLead && <div className="border-t border-line pt-10"><BlogCard b={lead} large /></div>}
            <div className="mt-14 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {(showLead ? rest : res.items).map((b) => <BlogCard key={b.id} b={b} />)}
            </div>
          </>
        )}
        <Pagination page={res.page} pages={res.pages} base="/blog" params={{ category: f.category, q: f.q }} />
      </section>
    </>
  )
}
