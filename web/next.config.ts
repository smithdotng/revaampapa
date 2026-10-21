import type { NextConfig } from 'next'
import path from 'node:path'

const uploadsHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_UPLOADS_URL ? new URL(process.env.NEXT_PUBLIC_UPLOADS_URL) : null
  } catch {
    return null
  }
})()

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // web/ is self-contained; don't let Next treat the Express app's folder as the workspace root
  turbopack: {
    root: path.resolve(__dirname),
  },
  outputFileTracingRoot: path.resolve(__dirname),
  // The models in ./legacy are plain CommonJS loaded with Node's require,
  // so these must stay un-bundled and resolve to the same copies.
  serverExternalPackages: ['mongoose', 'bcryptjs', 'nodemailer'],
  outputFileTracingIncludes: {
    '/**': ['./legacy/**/*.js'],
  },
  experimental: {
    serverActions: {
      // Registration forms carry documents and hotel photos
      bodySizeLimit: '40mb',
    },
    proxyClientMaxBodySize: '60mb',
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    localPatterns: [{ pathname: '/uploads/**' }, { pathname: '/brand/**' }],
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      ...(uploadsHost ? [{ protocol: uploadsHost.protocol.replace(':', '') as 'https' | 'http', hostname: uploadsHost.hostname }] : []),
    ],
  },
  async redirects() {
    return [
      // Old Express URLs that now live elsewhere
      { source: '/superadmin/properties/pending', destination: '/superadmin/properties?status=payment_confirmed', permanent: false },
      { source: '/superadmin/promoters/pending', destination: '/superadmin/promoters?status=pending', permanent: false },
      { source: '/superadmin/architects/pending', destination: '/superadmin/professionals?tab=architects', permanent: false },
      { source: '/properties/add/new', destination: '/property-owner/properties/add', permanent: true },
      { source: '/agent/pending', destination: '/dashboard', permanent: true },
      { source: '/hotels/superadmin/hotels', destination: '/superadmin/hotels', permanent: true },
      { source: '/superadmin/payments/pending', destination: '/superadmin/properties?status=payment_confirmed', permanent: false },
      { source: '/superadmin/inquiries/export/csv', destination: '/superadmin/inquiries/export', permanent: false },
      // The old project detail URL only ever showed a placeholder page
      { source: '/projects/:slug', destination: '/projects', permanent: false },
    ]
  },
}

export default nextConfig
