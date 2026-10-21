import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getHotel } from '@/lib/data'
import { currentSubscriber } from '@/actions/voucher'
import { ReserveForm } from './ReserveForm'

export const metadata: Metadata = { title: 'Register a stay', robots: { index: false } }

export default async function ReservePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const hotel = await getHotel(slug)
  if (!hotel) notFound()
  const sub = await currentSubscriber()
  if (!sub || !sub.hasActiveSubscription()) redirect('/hotels')

  return (
    <div className="wrap grid grid-cols-1 gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:py-16">
      <div>
        <Link href={`/hotels/${hotel.slug}`} className="text-sm text-muted hover:text-ink">Back to {hotel.name}</Link>
        <h1 className="t-1 mt-4">Register your stay at {hotel.name}</h1>
        <p className="lede mt-4">Registering before check-in is what makes your cashback claimable. Book and pay the hotel as you normally would.</p>
        <div className="mt-8 rounded-[var(--radius-lg)] bg-lagoon p-6 text-white">
          <p className="text-sm text-white/65">Cashback at this hotel</p>
          <p className="font-display text-5xl font-semibold tracking-tight">{hotel.voucherDiscountRate}%</p>
          <p className="mt-3 text-sm text-white/70">Membership {sub.subscriberCode}. The rate is locked when you register, even if the hotel’s rate changes later.</p>
        </div>
      </div>
      <div className="rounded-[var(--radius-lg)] border border-line bg-white p-6 md:p-8">
        <ReserveForm slug={hotel.slug} rate={hotel.voucherDiscountRate} defaults={{ name: sub.name, email: sub.email, phone: sub.phone }} />
      </div>
    </div>
  )
}
