import type { Metadata } from 'next'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { searchHotels } from '@/lib/data'
import { getSession } from '@/lib/session'
import { HotelCard } from '@/components/HotelCard'
import { Pagination } from '@/components/Pagination'
import { exitVoucherMode } from '@/actions/voucher'
import { VoucherCheck } from './VoucherPanel'

export const metadata: Metadata = {
  title: 'Partner hotels with Room Voucher cashback',
  description: 'Hotels in the Revaamp directory. Room Voucher subscribers get cashback on every registered stay.',
}

type SP = Promise<Record<string, string | string[] | undefined>>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined

export default async function HotelsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const f = { q: one(sp.q) || one(sp.city), state: one(sp.state), page: Number(one(sp.page)) || 1 }
  const [res, session] = await Promise.all([searchHotels(f), getSession()])
  const vm = session?.data.voucherMode || (session?.data.userType === 'voucher_subscriber' ? { name: session.data.userName || '', code: '', id: '' } : null)

  return (
    <>
      <section className="bg-lagoon text-white">
        <div className="wrap grid gap-10 py-14 md:py-16 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <h1 className="t-1 text-white">Partner hotels</h1>
            <p className="mt-4 max-w-xl text-lg text-white/75">
              Hotels, resorts and serviced apartments in the Revaamp directory. Room Voucher subscribers get cashback on every stay they register before check-in.
            </p>
          </div>
          <div className="rounded-[var(--radius-lg)] bg-lagoon-2 p-6">
            {vm ? (
              <div>
                <p className="text-sm text-white/65">Room Voucher{vm.code ? ` · ${vm.code}` : ''}</p>
                <p className="mt-1 text-xl font-semibold">Welcome back{vm.name ? `, ${vm.name.split(' ')[0]}` : ''}</p>
                <p className="mt-2 text-white/75">Cashback rates are shown on each hotel. Open a hotel to register your stay.</p>
                {session?.data.voucherMode && (
                  <form action={exitVoucherMode} className="mt-4">
                    <button className="text-sm font-medium text-white/80 underline underline-offset-2 hover:text-white">Not you? Stop showing my membership</button>
                  </form>
                )}
              </div>
            ) : (
              <>
                <p className="mb-4 text-lg font-semibold">Are you a Room Voucher subscriber?</p>
                <VoucherCheck />
              </>
            )}
          </div>
        </div>
      </section>

      <section className="wrap py-10">
        <form action="/hotels" method="get" role="search" className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Hotel name, city or state</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
            <input name="q" defaultValue={f.q} placeholder="Hotel name, city or state" className="input pl-12" />
          </label>
          <button className="btn btn-primary">Search hotels</button>
          {f.q && <Link href="/hotels" className="link text-sm">Clear</Link>}
        </form>
        <p className="mt-6 font-medium" aria-live="polite">{res.total} {res.total === 1 ? 'hotel' : 'hotels'}</p>

        {res.items.length ? (
          <div className="mt-6 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {res.items.map((h) => <HotelCard key={h.id} h={h} />)}
          </div>
        ) : (
          <div className="mt-6 rounded-[var(--radius-lg)] border border-dashed border-line-2 px-6 py-16 text-center">
            <h2 className="t-2">No hotels match that search</h2>
            <p className="mx-auto mt-3 max-w-md text-ink-2">Try another city. Own a hotel here? Apply to be listed.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/hotels" className="btn btn-primary">All hotels</Link>
              <Link href="/partner-hotel/register" className="btn btn-ghost">List your hotel</Link>
            </div>
          </div>
        )}
        <Pagination page={res.page} pages={res.pages} base="/hotels" params={{ q: f.q, state: f.state }} />
      </section>

      <section className="wrap pb-20">
        <div className="grid gap-6 rounded-[var(--radius-xl)] border border-line bg-white p-8 md:grid-cols-[1fr_auto] md:items-center md:p-10">
          <div>
            <h2 className="t-2">Run a hotel?</h2>
            <p className="mt-2 max-w-xl text-ink-2">Get your rooms off-taken by Revaamp and marketed by promoters and business partners across Africa.</p>
          </div>
          <Link href="/partner-hotel/register" className="btn btn-primary">Become a partner hotel</Link>
        </div>
      </section>
    </>
  )
}
