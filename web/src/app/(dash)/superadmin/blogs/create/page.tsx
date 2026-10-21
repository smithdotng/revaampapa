import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/admin'
import { DashHeader } from '@/components/dash/ui'
import { BlogForm } from '@/components/admin/Forms'

export const metadata: Metadata = { title: 'Write a post' }

export default async function CreateBlog() {
  await requireAdmin()
  return (
    <>
      <DashHeader back={{ label: '← Blog', href: '/superadmin/blogs' }} title="Write a post" />
      <BlogForm />
    </>
  )
}
