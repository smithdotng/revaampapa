import type { Metadata } from 'next'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { Models } from '@/lib/legacy'
import { requireAdmin, pageOf, rx, PAGE, qs } from '@/lib/admin'
import { plain } from '@/lib/guard'
import { formatDate } from '@/lib/format'
import { DashHeader, Panel, EmptyState, StatusPill, Table, Tabs } from '@/components/dash/ui'
import { Filters } from '@/components/admin/Filters'
import { Who, Pager, Actions } from '@/components/admin/ui'
import { Act } from '@/components/admin/Act'
import { toggleBlogFeatured, deleteBlog } from '@/actions/admin'

export const metadata: Metadata = { title: 'Blog' }

/* eslint-disable @typescript-eslint/no-explicit-any */
type SP = { status?: string; q?: string; page?: string }

export default async function AdminBlogs({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin()
  const sp = await searchParams
  const page = pageOf(sp.page)
  const query: any = {}
  if (sp.status) query.status = sp.status
  if (sp.q) query.$or = [{ title: rx(sp.q) }, { excerpt: rx(sp.q) }, { tags: rx(sp.q) }]
  const [items, total, all, published, draft, archived] = await Promise.all([
    Models.Blog.find(query).select('-content').sort('-createdAt').skip((page - 1) * PAGE).limit(PAGE).lean(),
    Models.Blog.countDocuments(query),
    Models.Blog.countDocuments(),
    Models.Blog.countDocuments({ status: 'published' }),
    Models.Blog.countDocuments({ status: 'draft' }),
    Models.Blog.countDocuments({ status: 'archived' }),
  ])
  const list = plain<any[]>(items)
  const tab = (status: string) => `/superadmin/blogs${qs({ status, q: sp.q })}`

  return (
    <>
      <DashHeader title="Blog" intro="Market news, guides and spotlights on /blog."
        actions={<Link href="/superadmin/blogs/create" className="btn btn-primary">Write a post</Link>} />
      <Tabs items={[
        { label: 'All', href: tab(''), active: !sp.status, count: all },
        { label: 'Published', href: tab('published'), active: sp.status === 'published', count: published },
        { label: 'Drafts', href: tab('draft'), active: sp.status === 'draft', count: draft },
        { label: 'Archived', href: tab('archived'), active: sp.status === 'archived', count: archived },
      ]} />
      <Filters search="Search titles, summaries and tags" />
      <Panel pad={false}>
        {list.length === 0 ? <EmptyState title="No posts here" action={<Link href="/superadmin/blogs/create" className="btn btn-primary">Write a post</Link>} /> : (
          <Table head={['Post', 'Categories', 'Views', 'Status', '']}>
            {list.map((b) => (
              <tr key={b._id}>
                <td className="max-w-[380px]">
                  <Who name={<span className="inline-flex items-center gap-1.5">{b.featured && <Star className="size-3.5 shrink-0 fill-roof text-roof" aria-label="Featured" />}{b.title}</span>}
                    sub={`${b.authorName || 'RevaampAPA'} · ${formatDate(b.publishedAt || b.createdAt)}`} href={`/superadmin/blogs/${b._id}/edit`} />
                </td>
                <td className="text-sm text-ink-2">{(b.categories || []).join(', ') || '—'}</td>
                <td>{(b.views || 0).toLocaleString('en-NG')}</td>
                <td><StatusPill status={b.status} /></td>
                <td>
                  <Actions>
                    {b.status === 'published' && <Link href={`/blog/${b.slug}`} target="_blank" className="btn btn-ghost min-h-10 px-4 text-sm">View</Link>}
                    <Link href={`/superadmin/blogs/${b._id}/edit`} className="btn btn-ghost min-h-10 px-4 text-sm">Edit</Link>
                    <Act action={toggleBlogFeatured} id={b._id} label={b.featured ? 'Unfeature' : 'Feature'} />
                    <Act action={deleteBlog} id={b._id} variant="danger" label="Delete" confirm={`Delete “${b.title}”? This can’t be undone.`} submitLabel="Delete post" />
                  </Actions>
                </td>
              </tr>
            ))}
          </Table>
        )}
        <Pager page={page} pages={Math.ceil(total / PAGE)} total={total} base="/superadmin/blogs" params={sp as Record<string, string>} />
      </Panel>
    </>
  )
}
