import Image from 'next/image'
import Link from 'next/link'

export function Logo({ tone = 'dark', className = '' }: { tone?: 'dark' | 'light'; className?: string }) {
  return (
    <Link href="/" className={`inline-flex shrink-0 items-center ${className}`} aria-label="RevaampAPA home">
      <Image
        src={tone === 'light' ? '/brand/logo-white.png' : '/brand/logo.png'}
        alt="Revaamp"
        width={200}
        height={60}
        priority
        className="h-[38px] w-auto"
      />
    </Link>
  )
}

/** The chevron from the Revaamp mark: orange slope, charcoal slope. */
export function RoofMark({ className = '', dark = '#3c4548' }: { className?: string; dark?: string }) {
  return (
    <svg viewBox="0 0 40 26" aria-hidden className={className}>
      <path d="M0 26 L20 0 L26 8 L10 26 Z" fill="#f58632" />
      <path d="M20 0 L40 26 L30 26 L26 8 Z" fill={dark} />
    </svg>
  )
}
