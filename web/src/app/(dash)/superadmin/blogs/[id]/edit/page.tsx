import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Models, mongoose } from '@/lib/legacy'
import { requireAdmin } from '@/lib/admin'
import { plain } from '@/lib/guard'
import { DashHeader } from '@/components/dash/ui'
import { BlogForm } from '@/components/admin/Forms'

export const metadata: Metadata = { title: 'Edit post' }

export default async function EditBlog({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  if (!mongoose.isValidObjectId(id)) notFound()
  const b = await Models.Blog.findById(id).lean()
  if (!b) notFound()
  return (
    <>
      <DashHeader back={{ label: '← Blog', href: '/superadmin/blogs' }} title="Edit post" />
      <BlogForm blog={plain(b)} />
    </>
  )
}
