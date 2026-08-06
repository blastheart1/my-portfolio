import { Inter } from "next/font/google";
import "./globals.css";
import CalendlyScript from '@/components/CalendlyScript';
import StructuredData from '@/components/StructuredData';
import ServiceWorker from '@/components/ServiceWorker';
import { ModalProvider } from '@/contexts/ModalContext';
import ClientLayoutContent from '@/components/ClientLayoutContent';
import { SITE_URL } from '@/lib/site';

// Using Inter as a close alternative to SF Pro Display
const inter = Inter({
  variable: "--font-sf-pro",
  subsets: ["latin"],
  display: 'swap',
  preload: true
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Code by Luis',
  description: 'Senior IBM ODM Specialist and QA Team Manager specializing in full-stack development, AI integration, and scalable systems. Building future-ready applications with precision and innovation.',
  keywords: [
    'Antonio Luis Santos', 
    'Full-Stack Developer', 
    'QA Specialist', 
    'IBM ODM', 
    'Software Development', 
    'AI Integration', 
    'Next.js', 
    'React', 
    'TypeScript',
    'Python',
    'TensorFlow',
    'Machine Learning',
    'Quality Assurance',
    'Bell Canada',
    'Manila Philippines',
    'Web Development',
    'Frontend Development',
    'Backend Development'
  ],
  authors: [{ name: 'Antonio Luis Santos' }],
  creator: 'Antonio Luis Santos',
  publisher: 'Antonio Luis Santos',
  robots: 'index, follow',
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'CodeByLuis.Dev',
    title: 'Code by Luis',
    description: 'Senior IBM ODM Specialist and QA Team Manager specializing in full-stack development, AI integration, and scalable systems. Expert in React, Next.js, Python, and AI technologies.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Code by Luis',
    description: 'Senior IBM ODM Specialist and QA Team Manager specializing in full-stack development, AI integration, and scalable systems.',
    creator: '@0xlv1s_',
    site: '@0xlv1s_',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/code-light.ico', type: 'image/x-icon', media: '(prefers-color-scheme: light)' },
      { url: '/code-dark.ico', type: 'image/x-icon', media: '(prefers-color-scheme: dark)' }
    ],
    shortcut: '/favicon.svg',
    apple: '/code-light.ico',
  },
  manifest: '/site.webmanifest',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' },
  ],
};

function LayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StructuredData />
      <ServiceWorker />
      <ClientLayoutContent>
        {children}
      </ClientLayoutContent>
      <CalendlyScript />
    </>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inter is self-hosted by next/font, so no preconnect is needed for
            it. Jost and Space Mono load as a plain stylesheet instead: they are
            decorative display faces, and next/font fetches font binaries at
            build time from fonts.gstatic.com — a hard build/render failure
            whenever that host is unreachable. A stylesheet link degrades to the
            fallback stack in globals.css instead of taking the page down. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Jost:wght@200;300;400&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <link rel="dns-prefetch" href="https://calendly.com" />
      </head>
      <body
        className={`${inter.variable} antialiased transition-colors duration-300`}
      >
        <ModalProvider>
          <LayoutContent>{children}</LayoutContent>
        </ModalProvider>
      </body>
    </html>
  );
}

