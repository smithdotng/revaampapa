import Image from 'next/image'
import { RoofMark } from './Logo'
import { mediaUrl } from '@/lib/format'

/**
 * Listing images come from user uploads (/uploads/...), occasionally a full
 * URL (Vercel Blob). Ours go through next/image; anything else renders as-is.
 */
export function SmartImage({
  src,
  alt,
  sizes,
  className = '',
  priority = false,
}: {
  src?: string | null
  alt: string
  sizes: string
  className?: string
  priority?: boolean
}) {
  if (!src) {
    return (
      <div className={`absolute inset-0 grid place-items-center bg-mist ${className}`} aria-hidden>
        <RoofMark className="w-12 opacity-40" />
      </div>
    )
  }
  src = mediaUrl(src)
  const optimisable = (src.startsWith('/') || /^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//.test(src)) && !src.includes('?')
  if (optimisable) {
    return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={`object-cover ${className}`} />
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} className={`absolute inset-0 h-full w-full object-cover ${className}`} />
}
