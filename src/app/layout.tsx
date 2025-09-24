import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle"; // we'll create this
import FloatingNav from "@/components/FloatingNav";
import CalendlyScript from '@/components/CalendlyScript';
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: 'Luis.dev - Antonio Luis Santos | Full-Stack Developer & QA Specialist',
  description: 'Senior IBM ODM Specialist and QA Team Manager specializing in full-stack development, AI integration, and scalable systems. Building future-ready applications with precision and innovation.',
  keywords: ['Antonio Luis Santos', 'Full-Stack Developer', 'QA Specialist', 'IBM ODM', 'Software Development', 'AI Integration', 'Next.js', 'React', 'TypeScript'],
  authors: [{ name: 'Antonio Luis Santos' }],
  creator: 'Antonio Luis Santos',
  publisher: 'Antonio Luis Santos',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://luis.dev',
    siteName: 'Luis.dev',
    title: 'Luis.dev - Antonio Luis Santos | Full-Stack Developer & QA Specialist',
    description: 'Senior IBM ODM Specialist and QA Team Manager specializing in full-stack development, AI integration, and scalable systems.',
    images: [
      {
        url: '/profile-photo2.png',
        width: 1200,
        height: 630,
        alt: 'Antonio Luis Santos - Full-Stack Developer',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Luis.dev - Antonio Luis Santos | Full-Stack Developer & QA Specialist',
    description: 'Senior IBM ODM Specialist and QA Team Manager specializing in full-stack development, AI integration, and scalable systems.',
    images: ['/profile-photo2.png'],
    creator: '@0xlv1s_',
  },
  icons: {
    icon: [
      { url: '/code-light.ico', type: 'image/x-icon', media: '(prefers-color-scheme: light)' },
      { url: '/code-dark.ico', type: 'image/x-icon', media: '(prefers-color-scheme: dark)' },
      { url: '/code-light.ico', type: 'image/x-icon' }
    ],
    shortcut: '/code-light.ico',
    apple: '/code-light.ico',
  },
  manifest: '/site.webmanifest',
  viewport: 'width=device-width, initial-scale=1',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://calendly.com" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased transition-colors duration-300`}
      >
        <ThemeToggle />
        <FloatingNav />
        {children}
        <CalendlyScript />
      </body>
    </html>
  );
}

