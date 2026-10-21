import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink, Pencil, Star } from 'lucide-react'
import { Models, mongoose } from '@/lib/legacy'
import { requireAdmin } from '@/lib/admin'
import { plain } from '@/lib/guard'
import { naira, formatDate, place, PROPERTY_TYPES, TRANSACTION_TYPES, mediaUrl } from '@/lib/format'
import { DashHeader, Panel, StatusPill, KeyValue } from '@/components/dash/ui'
import { Act } from '@/components/admin/Act'
import { cleanHtml } from '@/lib/sanitize'
import { DocLink, Actions } from '@/components/admin/ui'
import {
  verifyProperty, rejectProperty, confirmPropertyPayment, togglePropertyFeatured, setPropertyStatus, deletePropertyAdmin,
} from '@/actions/admin'

export const metadata: Metadata = { title: 'Property' }

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function AdminProperty({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  if (!mongoose.isValidObjectId(id)) notFound()
  const doc = await Models.Property.findById(id).populate('owner', 'name email phone userType propertyOwnerProfile').lean()
  if (!doc) notFound()
  const p = plain<any>(doc)
  const [inquiries, promotions] = await Promise.all([
    Models.Inquiry.countDocuments({ property: id }),
    Models.Promotion.countDocuments({ property: id }).catch(() => 0),
  ])
  const f = p.features || {}
  const proof = p.shortletDetails?.verificationPaymentProofUrl || p.verificationPaymentProofUrl
  const owner = p.listedBySuperadmin ? p.externalOwner || {} : p.owner || {}
  const vs = p.verificationStatus
  const features = [
    f.bedrooms ? `${f.bedrooms} bed` : '', f.bathrooms ? `${f.bathrooms} bath` : '', f.toilets ? `${f.toilets} toilets` : '',
    f.parkingSpaces ? `${f.parkingSpaces} parking` : '', f.floorArea ? `${f.floorArea}m² floor` : '', f.landArea ? `${f.landArea}m² land` : '',
    f.furnished && 'Furnished', f.serviced && 'Serviced', f.security && 'Security', f.powerSupply && 'Steady power', f.borehole && 'Borehole',
  ].filter(Boolean).join(' · ')

  return (
    <>
      <DashHeader
        back={{ label: '← Properties', href: '/superadmin/properties' }}
        title={p.title}
        intro={<span className="inline-flex flex-wrap items-center gap-2"><StatusPill status={vs} /> <StatusPill status={p.status} /> {p.featured && <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#a24d0e]"><Star className="size-3.5 fill-roof text-roof" /> Featured until {formatDate(p.featuredExpiry)}</span>}</span>}
        actions={<>
          {vs === 'verified' && <Link href={`/properties/${p.slug}`} target="_blank" className="btn btn-ghost"><ExternalLink className="size-4" /> View live</Link>}
          <Link href={`/superadmin/properties/${p._id}/edit`} className="btn btn-ghost"><Pencil className="size-4" /> Edit</Link>
        </>}
      />

      {(vs === 'payment_confirmed' || vs === 'verification_pending') && (
        <Panel className="mb-6 border-lagoon" title="Ready for verification" intro="The owner has submitted proof of the ₦20,000 verification fee. Check the receipt and the listing, then verify or send it back.">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
            <KeyValue items={[
              ['Transfer reference', p.verificationPaymentReference || '—'],
              ['Paid on', formatDate(p.verificationPaymentDate) || '—'],
              ['Receipt', <DocLink key="r" url={proof} label="Open receipt" />],
            ]} />
            <Actions>
              <Act action={verifyProperty} id={p._id} variant="ok" label="Verify and publish" ask={[{ name: 'note', label: 'Note to the owner', type: 'textarea', placeholder: 'Optional message included in the approval email' }]} submitLabel="Publish listing" />
              <Act action={rejectProperty} id={p._id} variant="danger" label="Send back" ask={[{ name: 'reason', label: 'What needs fixing', type: 'textarea', required: true, placeholder: 'e.g. The receipt doesn’t match the fee, or photos are unclear' }]} submitLabel="Send back to owner" />
            </Actions>
          </div>
        </Panel>
      )}
      {vs === 'pending_payment' && (
        <Panel className="mb-6" title="Waiting for the verification fee" intro="The owner hasn’t submitted payment proof yet. If they paid another way, confirm it here to move the listing into review.">
          <Actions>
            <Act action={confirmPropertyPayment} id={p._id} variant="primary" label="Mark fee as received" confirm="Only do this if you’ve seen the ₦20,000 payment in the account." submitLabel="Yes, fee received" />
          </Actions>
        </Panel>
      )}
      {vs === 'rejected' && p.verificationFeedback?.message && (
        <Panel className="mb-6" title="Sent back to the owner" intro={formatDate(p.verificationFeedback.providedAt)}>
          <p className="text-ink-2">{p.verificationFeedback.message}</p>
          <div className="mt-4"><Act action={verifyProperty} id={p._id} variant="ghost" label="Verify anyway" confirm="Publish this listing now?" submitLabel="Publish" /></div>
        </Panel>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="grid content-start gap-6">
          <Panel title={`Photos (${p.images?.length || 0})`}>
            {p.images?.length ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {p.images.map((img: any, i: number) => (
                  <li key={img.url + i} className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-sm)] bg-mist">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <a href={mediaUrl(img.url)} target="_blank" rel="noopener noreferrer"><img src={mediaUrl(img.url)} alt="" className="h-full w-full object-cover" loading="lazy" /></a>
                    {img.isPrimary && <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-xs font-semibold">Cover</span>}
                  </li>
                ))}
              </ul>
            ) : <p className="text-muted">No photos.</p>}
          </Panel>
          <Panel title="Description">
            <div className="prose-rv max-w-none text-ink-2" dangerouslySetInnerHTML={{ __html: cleanHtml(p.description || '') }} />
            {p.videoUrl && <p className="mt-4"><a href={p.videoUrl} target="_blank" rel="noopener noreferrer" className="link">Video tour</a></p>}
          </Panel>
        </div>
        <div className="grid content-start gap-6">
          <Panel title="Details">
            <KeyValue items={[
              ['Price', <>{naira(p.price)}{p.priceNegotiable && <span className="text-sm font-normal text-muted"> · negotiable</span>}</>],
              ['Deal', TRANSACTION_TYPES[p.transactionType] || p.transactionType],
              ['Type', PROPERTY_TYPES[p.propertyType] || p.propertyType],
              ['Location', [p.location?.address, place(p.location), p.location?.lga].filter(Boolean).join(', ')],
              ['Landmark', p.location?.landmark],
              ['Features', features || '—'],
              ['Agency fee', naira(p.agencyFee)],
              ['Views', (p.views || 0).toLocaleString('en-NG')],
              ['Enquiries', <Link key="i" href={`/superadmin/inquiries?property=${p._id}`} className="link">{inquiries}</Link>],
              ['Promoter links', promotions],
              ['Added', formatDate(p.createdAt)],
            ]} />
          </Panel>
          <Panel title={p.listedBySuperadmin ? 'Owner (listed by admin)' : 'Owner'}>
            <KeyValue items={[
              ['Name', !p.listedBySuperadmin && owner._id ? <Link key="o" href={`/superadmin/property-owners/${owner._id}`} className="link">{owner.name}</Link> : owner.name],
              ['Email', owner.email ? <a key="e" href={`mailto:${owner.email}`} className="link">{owner.email}</a> : '—'],
              ['Phone', owner.phone ? <a key="p" href={`tel:${owner.phone}`} className="link">{owner.phone}</a> : '—'],
              ...(owner.address || owner.propertyOwnerProfile?.address ? [['Address', owner.address || owner.propertyOwnerProfile?.address] as [string, string]] : []),
            ]} />
          </Panel>
          <Panel title="Manage">
            <div className="grid gap-4">
              <Actions>
                <Act action={togglePropertyFeatured} id={p._id} label={p.featured ? 'Remove from featured' : 'Feature for 30 days'} icon={<Star className="size-4" />} />
              </Actions>
              {vs === 'verified' && (
                <Actions>
                  <Act action={setPropertyStatus} id={p._id} label="Change availability" ask={[{ name: 'status', label: 'Availability', type: 'select', defaultValue: p.status, options: [['available', 'Available'], ['sold', 'Sold'], ['rented', 'Rented'], ['unavailable', 'Unavailable']] }]} submitLabel="Save" />
                </Actions>
              )}
              <div className="border-t border-line pt-4">
                <Act action={deletePropertyAdmin} id={p._id} variant="danger" label="Delete listing" confirm={`Delete “${p.title}” and its photos? This can’t be undone.`} submitLabel="Delete permanently" />
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}
