'use client'
import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <section className="wrap grid min-h-[60vh] place-items-center py-24 text-center">
      <div className="max-w-lg">
        <h1 className="t-1">This page didn’t load</h1>
        <p className="lede mx-auto mt-4">Something failed on our side. Try again, and if it keeps happening email info@revaampapa.com.</p>
        <button onClick={reset} className="btn btn-primary mt-8">Try again</button>
      </div>
    </section>
  )
}
