import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Inter } from "next/font/google";
import "./globals.css";
import CalendlyScript from '@/components/CalendlyScript';
import StructuredData from '@/components/StructuredData';
import { siteIdentityNodes } from '@/lib/structured-data';
import { getServiceTiers } from '@/lib/content-queries';
import ServiceWorker from '@/components/ServiceWorker';
import { ModalProvider } from '@/contexts/ModalContext';
import ClientLayoutContent from '@/components/ClientLayoutContent';
import { ROLE_TITLE, SITE_URL } from '@/lib/site';

// Using Inter as a close alternative to SF Pro Display
const inter = Inter({
  variable: "--font-sf-pro",
  subsets: ["latin"],
  display: 'swap',
  preload: true
});

export const metadata = {
  metadataBase: new URL(SITE_URL),

  // Leads with the phrase a buyer types, then the name. "AI Full-Stack
  // Software Engineer" was accurate but is the most contested term on the
  // list and says nothing about what is actually for sale; "AI Automation &
  // Integration Engineer" is closer to the work, closer to how the problem
  // gets described out loud, and far less crowded. The name stays because
  // it is the query that converts best — someone checking you out after a
  // call. 58 characters, so the SERP shows all of it.
  title: {
    default: `${ROLE_TITLE} | Antonio Luis Santos`,
    template: '%s | Antonio Luis Santos',
  },

  // 148 characters, so it survives the search snippet intact. Opens with the
  // role term and then states the problem in the words a client uses, rather
  // than listing vendors. The long-form framing lives in the FAQ and
  // llms.txt, where there is room and nothing truncates.
  description:
    'AI automation and integration engineer. I connect the systems your team re-keys data between, and add AI only where it beats a deterministic rule. Remote, for hire.',


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
    title: `${ROLE_TITLE} | Antonio Luis Santos`,
    // No length limit here, so this one carries the differentiator.
    description:
      'I remove the manual work that exists only because your systems do not talk to each other: API and platform integration, workflow automation, and LLM features with guardrails. Behind the AI work sits a decade of enterprise decision automation at Bell Canada (IBM ODM / BRMS), which is what makes the judgement call about what should stay a deterministic rule.',
    firstName: 'Antonio Luis',
    lastName: 'Santos',
  },

  twitter: {
    card: 'summary_large_image',
    title: `${ROLE_TITLE} | Antonio Luis Santos`,
    description:
      'I connect the systems your team re-keys data between, and add AI only where it beats a deterministic rule. Integration, automation, and LLM features built to survive production.',
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

async function LayoutContent({ children }: { children: React.ReactNode }) {
  // The offer catalog in the JSON-LD is built from these rows rather than
  // restated, so a price edited in /edit cannot leave the structured data
  // behind. getServiceTiers swallows its own errors and returns [], which
  // omits the catalog rather than failing the page.
  const tiers = await getServiceTiers();

  return (
    <>
      {/*
        Identity nodes only: Person, ProfessionalService, WebSite. These
        describe entities and are correct on any URL.

        ProfilePage and FAQPage used to render here too, which meant every
        route served a ProfilePage claiming to be the home page, plus a
        duplicate of the entire FAQ. They now live on / alone, and the case
        studies carry their own CreativeWork. See src/lib/structured-data.ts.
      */}
      <StructuredData nodes={siteIdentityNodes(tiers)} />
      <ServiceWorker />
      <ClientLayoutContent>
        {children}
      </ClientLayoutContent>
      <CalendlyScript />
      {/*
        Field data, which this site has never had. The home page loads GSAP,
        Framer Motion, TensorFlow.js and a scroll-driven hero, so LCP and INP
        are a real risk and there has been no way to know. Core Web Vitals
        feed ranking, and lab numbers from a fast laptop do not.

        Both are deferred and send nothing until the page is interactive.
      */}
      <Analytics />
      <SpeedInsights />
    </>
  );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
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
        {/* llms.txt is discoverable by convention alone otherwise. Cheap to
            advertise, and the long form is the one an assistant ingesting the
            whole site should take. */}
        <link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt" />
        <link rel="alternate" type="text/plain" href="/llms-full.txt" title="llms.txt (full)" />
      </head>
      <body
        className={`${inter.variable} antialiased transition-colors duration-300`}
      >
        <ModalProvider>
          {await LayoutContent({ children })}
        </ModalProvider>
      </body>
    </html>
  );
}

