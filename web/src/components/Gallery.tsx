'use client'
import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X, Images } from 'lucide-react'

/** Large lead image, thumbnails, and a keyboard-friendly full-screen viewer. */
export function Gallery({ images, title }: { images: { url: string }[]; title: string }) {
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const n = images.length
  const go = useCallback((d: number) => setIndex((i) => (i + d + n) % n), [n])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, go])

  if (!n) return <div className="aspect-[16/10] rounded-[var(--radius-lg)] bg-mist" />

  return (
    <div>
      <div className="relative">
        <button type="button" onClick={() => setOpen(true)} className="group relative block aspect-[16/10] w-full overflow-hidden rounded-[var(--radius-lg)] bg-mist" aria-label="Open photo viewer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[index].url} alt={`${title} — photo ${index + 1} of ${n}`} className="h-full w-full object-contain" />
          <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-white/95 px-3.5 py-2 text-sm font-semibold text-ink">
            <Images className="size-4" aria-hidden /> {index + 1} / {n}
          </span>
        </button>
        {n > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-ink shadow" aria-label="Previous photo"><ChevronLeft className="size-5" /></button>
            <button type="button" onClick={() => go(1)} className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-ink shadow" aria-label="Next photo"><ChevronRight className="size-5" /></button>
          </>
        )}
      </div>
      {n > 1 && (
        <ul className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {images.map((im, i) => (
            <li key={im.url + i} className="shrink-0">
              <button type="button" onClick={() => setIndex(i)} aria-label={`Show photo ${i + 1}`} aria-current={i === index}
                className={`relative block h-[68px] w-24 overflow-hidden rounded-[var(--radius-sm)] ring-2 ring-offset-2 ring-offset-paper transition ${i === index ? 'ring-ink' : 'ring-transparent opacity-70 hover:opacity-100'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.url} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <div role="dialog" aria-modal="true" aria-label={`${title} photos`} className="fixed inset-0 z-[70] flex flex-col bg-[#0b1717]/95 [animation:rv-fade_.2s_ease-out]">
          <div className="flex items-center justify-between p-4 text-white">
            <p className="text-sm">{index + 1} / {n}</p>
            <button type="button" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close"><X className="size-5" /></button>
          </div>
          <div className="relative flex flex-1 items-center justify-center px-4 pb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[index].url} alt={`${title} — photo ${index + 1}`} className="max-h-full max-w-full object-contain" />
            {n > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} className="absolute left-4 grid size-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Previous photo"><ChevronLeft className="size-6" /></button>
                <button type="button" onClick={() => go(1)} className="absolute right-4 grid size-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Next photo"><ChevronRight className="size-6" /></button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
