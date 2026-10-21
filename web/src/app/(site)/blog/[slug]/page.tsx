import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBlog, getRelatedBlogs, countBlogView } from '@/lib/data'
import { formatDate } from '@/lib/format'
import { cleanHtml } from '@/lib/sanitize'
import { SITE } from '@/lib/site'
import { SmartImage } from '@/components/SmartImage'
import { BlogCard } from '@/components/BlogCard'
import { ShareBar } from '@/components/ShareBar'

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const b = await getBlog((await params).slug)
  if (!b) return { title: 'Article not found' }
  return {
    title: b.metaTitle || b.title,
    description: b.metaDescription || b.excerpt,
    openGraph: { type: 'article', title: b.title, description: b.excerpt, images: [{ url: b.ogImage || b.featuredImage }], publishedTime: b.publishedAt },
  }
}

export default async function BlogPost({ params }: { params: Params }) {
  const b = await getBlog((await params).slug)
  if (!b) notFound()
  void countBlogView(b.id)
  const related = await getRelatedBlogs(b)

  return (
    <>
      <article>
        <header className="wrap max-w-[860px] pb-10 pt-12 md:pt-16">
          <p className="text-sm text-muted">
            <Link href="/blog" className="hover:text-ink">Blog</Link>
            {b.categories[0] && <> / <Link href={`/blog?category=${encodeURIComponent(b.categories[0])}`} className="font-semibold text-teal-ink">{b.categories[0]}</Link></>}
          </p>
          <h1 className="t-1 mt-4">{b.title}</h1>
          <p className="lede mt-4">{b.excerpt}</p>
          <p className="mt-6 text-sm text-muted">By {b.authorName} / {formatDate(b.publishedAt)} / {b.readingTime} min read</p>
        </header>
        <div className="wrap max-w-[1100px]">
          <div className="relative aspect-[16/8] overflow-hidden rounded-[var(--radius-lg)] bg-mist">
            <SmartImage src={b.featuredImage} alt="" sizes="1100px" priority />
          </div>
        </div>
        <div className="wrap max-w-[760px] py-14">
          <div className="prose-rv" dangerouslySetInnerHTML={{ __html: cleanHtml(b.content) }} />
          {b.tags.length > 0 && (
            <ul className="mt-10 flex flex-wrap gap-2">{b.tags.map((t) => <li key={t} className="rounded-full bg-mist px-3 py-1 text-sm text-lagoon">{t}</li>)}</ul>
          )}
          <div className="mt-10 border-t border-line pt-6">
            <p className="mb-3 font-medium">Share this article</p>
            <ShareBar url={`${SITE.url}/blog/${b.slug}`} title={b.title} />
          </div>
        </div>
      </article>
      {related.length > 0 && (
        <section className="border-t border-line bg-white">
          <div className="wrap py-16">
            <h2 className="t-2">Keep reading</h2>
            <div className="mt-8 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{related.map((r) => <BlogCard key={r.id} b={r} />)}</div>
          </div>
        </section>
      )}
    </>
  )
}
