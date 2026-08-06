import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  // resend dynamically imports @react-email/render for React email templates.
  // We only ever pass `html:` strings, so that code path never executes — but
  // the bundler still has to resolve the import. Keeping resend external to
  // the server bundle avoids pulling in a renderer we do not use.
  //
  // (Until 2026-08 this resolved by accident: the unused `portfolio-chatbot`
  // GitHub dependency happened to declare @react-email/render, and npm hoisted
  // it. Removing that package surfaced the real requirement.)
  serverExternalPackages: ['resend'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        pathname: '/**',
      },
      {
        // Space scene artwork (astronaut, clouds). Scoped to this account's
        // delivery path rather than all of Cloudinary.
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/doatpmjdp/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    qualities: [25, 50, 75, 90, 100],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Production only. In dev this told the browser to cache built chunks
      // for a year and never revalidate, so edits to CSS or components did not
      // appear until a manual cache clear — Next warns about exactly this on
      // startup. Content-hashed filenames make the immutable hint correct for
      // real builds and actively harmful for the dev server.
      ...(isProduction
        ? [
            {
              source: '/_next/static/(.*)',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'public, max-age=31536000, immutable',
                },
              ],
            },
          ]
        : []),
    ];
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
};

export default nextConfig;
