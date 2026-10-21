import Link from 'next/link'
import { RoofMark } from '@/components/Logo'

export default function NotFound() {
  return (
    <section className="wrap grid min-h-[60vh] place-items-center py-24 text-center">
      <div className="max-w-lg">
        <RoofMark className="mx-auto w-16" />
        <h1 className="t-1 mt-6">We couldn’t find that page</h1>
        <p className="lede mx-auto mt-4">The listing may have been sold, rented or taken down, or the link has a typo.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/properties" className="btn btn-primary">Browse properties</Link>
          <Link href="/" className="btn btn-ghost">Go to the homepage</Link>
        </div>
      </div>
    </section>
  )
}
