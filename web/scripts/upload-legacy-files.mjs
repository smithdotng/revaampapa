#!/usr/bin/env node
/**
 * Copy the old site's uploads (property photos, hotel photos, receipts,
 * certificates…) into this project's Vercel Blob store, keeping their paths,
 * so every /uploads/... link already saved in the database keeps working.
 *
 *   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_... node scripts/upload-legacy-files.mjs /path/to/public/uploads
 *
 * Get the token from Vercel → your project → Storage → the Blob store → .env.local tab.
 * Run it against the uploads folder from the live server (download it first),
 * not just the copy in git, which is missing anything uploaded on the server.
 * Safe to re-run: files already in the store are skipped.
 *
 * When it finishes it prints the value to set as NEXT_PUBLIC_UPLOADS_URL.
 */
import fs from 'node:fs'
import path from 'node:path'
import { put, head } from '@vercel/blob'

const root = path.resolve(process.argv[2] || '../public/uploads')
const token = process.env.BLOB_READ_WRITE_TOKEN
if (!token) { console.error('Set BLOB_READ_WRITE_TOKEN first.'); process.exit(1) }
if (!fs.existsSync(root)) { console.error(`No folder at ${root}`); process.exit(1) }

const TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf', '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) yield* walk(p)
    else if (e.isFile() && !e.name.startsWith('.')) yield p
  }
}

const jobs = []
for (const file of walk(root)) {
  const rel = path.relative(root, file).split(path.sep).join('/')
  jobs.push({ file, pathname: `uploads/${rel}` })
  // The old app served /uploads/hotels/* from public/uploads/properties
  if (rel.startsWith('properties/') && path.basename(rel).startsWith('hotel')) jobs.push({ file, pathname: `uploads/hotels/${path.basename(rel)}` })
}

let done = 0, skipped = 0, failed = 0, base = ''
const queue = [...jobs]
async function worker() {
  for (let j = queue.shift(); j; j = queue.shift()) {
    try {
      const existing = await head(j.pathname, { token }).catch(() => null)
      if (existing) { skipped++; base ||= existing.url.slice(0, existing.url.indexOf('/uploads/')); continue }
      const blob = await put(j.pathname, fs.readFileSync(j.file), {
        access: 'public', token, addRandomSuffix: false, allowOverwrite: true,
        contentType: TYPES[path.extname(j.file).toLowerCase()] || 'application/octet-stream',
      })
      base ||= blob.url.slice(0, blob.url.indexOf('/uploads/'))
      done++
      if (done % 25 === 0) console.log(`${done + skipped}/${jobs.length}…`)
    } catch (err) {
      failed++
      console.error(`✗ ${j.pathname}: ${err.message}`)
    }
  }
}
console.log(`Uploading ${jobs.length} files from ${root}`)
await Promise.all(Array.from({ length: 6 }, worker))
console.log(`\nDone: ${done} uploaded, ${skipped} already there, ${failed} failed.`)
if (base) console.log(`\nIn Vercel, set NEXT_PUBLIC_UPLOADS_URL=${base}\nthen redeploy.`)
