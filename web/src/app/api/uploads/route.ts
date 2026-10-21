import { NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

/**
 * Direct-to-Blob uploads.
 *
 * Vercel caps a request at 4.5MB, so forms with photos or documents send the
 * files from the browser straight to the Blob store, then submit only the
 * resulting URLs (see lib/upload-client.ts). This route hands out the short-lived
 * upload tokens and limits what can be uploaded.
 */
const ALLOWED = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export function GET() {
  return NextResponse.json({ direct: !!process.env.BLOB_READ_WRITE_TOKEN }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: 'Uploads go through the form here.' }, { status: 400 })
  let body: HandleUploadBody
  try {
    body = (await request.json()) as HandleUploadBody
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!/^uploads\/[a-z0-9-]{1,40}\/[A-Za-z0-9._-]{1,120}$/.test(pathname)) throw new Error('Invalid file name')
        return {
          allowedContentTypes: ALLOWED,
          maximumSizeInBytes: 15 * 1024 * 1024,
          // Receipts and certificates shouldn't be guessable
          addRandomSuffix: true,
          validUntil: Date.now() + 10 * 60 * 1000,
        }
      },
    })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
