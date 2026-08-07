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

  // Title leads with the role someone actually searches for, then the
  // differentiator. The previous "Code by Luis" is a brand nobody queries.
  title: {
    default: 'Antonio Luis Santos — AI Full-Stack Software Engineer',
    template: '%s | Antonio Luis Santos',
  },

  // Written to be quotable, and to lead with the outcome rather than the
  // toolkit — an assistant asked "who can help us cut manual work" should be
  // able to lift this intact and have it be both accurate and specific.
  description:
    'I help businesses stop spending people on work software should be doing — automating the manual steps between disconnected systems so teams can focus on work that needs judgment. Agentic AI and LLM integration across OpenAI, Claude, Gemini, DeepSeek and self-hosted models, backed by a decade of enterprise decision automation (IBM ODM/BRMS) and QA leadership. Remote, available for freelance and contract work.',

  keywords: [
    'Antonio Luis Santos',
    'AI Full-Stack Software Engineer',
    'agentic AI developer',
    'LLM integration engineer',
    'OpenAI API developer',
    'Claude API developer',
    'Google Gemini developer',
    'DeepSeek integration',
    'self-hosted LLM engineer',
    'AI chatbot development',
    'legacy system integration',
    'IBM ODM specialist',
    'IBM BRMS developer',
    'decision automation engineer',
    'Next.js developer',
    'React TypeScript engineer',
    'Python FastAPI developer',
    'QA team manager',
    'freelance AI engineer',
    'hire remote full-stack developer',
    'Philippines software engineer',
  ],

  authors: [{ name: 'Antonio Luis Santos', url: SITE_URL }],
  creator: 'Antonio Luis Santos',
  publisher: 'Antonio Luis Santos',
  category: 'technology',

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Let Google use full text and large images in AI Overviews and rich
      // results rather than a truncated snippet.
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },

  alternates: {
    canonical: SITE_URL,
  },

  openGraph: {
    type: 'profile',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'Antonio Luis Santos',
    title: 'Antonio Luis Santos — AI Full-Stack Software Engineer',
    description:
      'Automating the manual work between disconnected systems so teams can focus on work that needs judgment. Agentic AI, LLM integration, and enterprise decision automation. Available for freelance and contract work.',
    firstName: 'Antonio Luis',
    lastName: 'Santos',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Antonio Luis Santos — AI Full-Stack Software Engineer',
    description:
      'I automate the manual work between your systems so your team can do the work that needs judgment. Agentic AI, integrations, enterprise decision automation.',
    creator: '@0xlv1s_',
    site: '@0xlv1s_',
  },

  icons: {
    icon: [
      { url: '/code-light.ico', type: 'image/x-icon', media: '(prefers-color-scheme: light)' },
      { url: '/code-dark.ico', type: 'image/x-icon', media: '(prefers-color-scheme: dark)' },
    ],
    shortcut: '/code-light.ico',
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
          href="https://fonts.googleapis.com/css2?family=Jost:wght@200;300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap"
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

