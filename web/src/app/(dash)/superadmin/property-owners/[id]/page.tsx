import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Models, mongoose } from '@/lib/legacy'
import { requireAdmin } from '@/lib/admin'
import { plain } from '@/lib/guard'
import { naira, formatDate, place } from '@/lib/format'
import { DashHeader, Panel, Stat, StatGrid, StatusPill, Table, KeyValue, EmptyState } from '@/components/dash/ui'
import { Act } from '@/components/admin/Act'
import { Who } from '@/components/admin/ui'
import { toggleUserSuspended } from '@/actions/admin'

export const metadata: Metadata = { title: 'Property owner' }

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function Owner({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  if (!mongoose.isValidObjectId(id)) notFound()
  const doc = await Models.User.findOne({ _id: id, userType: 'property_owner' }).select('-password').lean()
  if (!doc) notFound()
  const u = plain<any>(doc)
  const [props, inquiries] = await Promise.all([
    Models.Property.find({ owner: id }).sort('-createdAt').lean(),
    Models.Inquiry.countDocuments({ propertyOwner: id }),
  ])
  const list = plain<any[]>(props)
  const live = list.filter((p) => p.verificationStatus === 'verified').length
  const review = list.filter((p) => p.verificationStatus === 'payment_confirmed').length
  const value = list.reduce((s, p) => s + (p.price || 0), 0)
  const o = u.propertyOwnerProfile || {}

  return (
    <>
      <DashHeader back={{ label: '← Property owners', href: '/superadmin/property-owners' }} title={u.name}
        intro={<span className="inline-flex items-center gap-2"><StatusPill status={u.isSuspended ? 'suspended' : 'active'} /> <span className="text-muted">Joined {formatDate(u.createdAt)}</span></span>}
        actions={<Act action={toggleUserSuspended} id={u._id} variant={u.isSuspended ? 'ghost' : 'danger'} label={u.isSuspended ? 'Restore account' : 'Suspend'} confirm={u.isSuspended ? undefined : 'They’ll be signed out and can’t sign in until restored. Their listings stay as they are.'} submitLabel="Suspend" />} />
      <StatGrid>
        <Stat label="Listings" value={list.length} accent />
        <Stat label="Live" value={live} />
        <Stat label="To verify" value={review} />
        <Stat label="Enquiries" value={inquiries} hint={`Listed value ${naira(value, { compact: true })}`} />
      </StatGrid>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_2fr]">
        <Panel title="Contact">
          <KeyValue items={[
            ['Email', <a key="e" href={`mailto:${u.email}`} className="link">{u.email}</a>],
            ['Phone', u.phone ? <a key="p" href={`tel:${u.phone}`} className="link">{u.phone}</a> : '—'],
            ['Company', o.company],
            ['RC number', o.rcNumber],
            ['Address', o.address],
          ]} />
        </Panel>
        <Panel title="Listings" pad={false}>
          {list.length === 0 ? <EmptyState title="No listings yet" /> : (
            <Table head={['Property', 'Price', 'Review', 'Added']}>
              {list.map((p) => (
                <tr key={p._id}>
                  <td><Who name={p.title} sub={place(p.location)} href={`/superadmin/properties/${p._id}`} /></td>
                  <td className="whitespace-nowrap">{naira(p.price, { compact: true })}</td>
                  <td><StatusPill status={p.verificationStatus} /></td>
                  <td className="whitespace-nowrap text-muted">{formatDate(p.createdAt)}</td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>
      </div>
      <p className="mt-6 text-sm text-muted"><Link href={`/superadmin/inquiries?owner=${u._id}`} className="link">See their enquiries</Link></p>
    </>
  )
}
