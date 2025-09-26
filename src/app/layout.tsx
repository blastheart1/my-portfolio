import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle"; // we'll create this
import FloatingNav from "@/components/FloatingNav";
import CalendlyScript from '@/components/CalendlyScript';
import BackToTop from '@/components/BackToTop';
import StructuredData from '@/components/StructuredData';
import ServiceWorker from '@/components/ServiceWorker';
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: 'Luis.dev - Antonio Luis Santos | Full-Stack Developer & QA Specialist',
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
    canonical: 'https://luis.dev',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://luis.dev',
    siteName: 'Luis.dev',
    title: 'Luis.dev - Antonio Luis Santos | Full-Stack Developer & QA Specialist',
    description: 'Senior IBM ODM Specialist and QA Team Manager specializing in full-stack development, AI integration, and scalable systems. Expert in React, Next.js, Python, and AI technologies.',
    images: [
      {
        url: 'https://luis.dev/profile-photo2.png',
        width: 1200,
        height: 630,
        alt: 'Antonio Luis Santos - Senior IBM ODM Specialist and QA Team Manager specializing in full-stack development and AI integration',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Luis.dev - Antonio Luis Santos | Full-Stack Developer & QA Specialist',
    description: 'Senior IBM ODM Specialist and QA Team Manager specializing in full-stack development, AI integration, and scalable systems.',
    images: ['https://luis.dev/profile-photo2.png'],
    creator: '@0xlv1s_',
    site: '@0xlv1s_',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' },
      { url: '/code-light.ico', type: 'image/x-icon', media: '(prefers-color-scheme: light)' },
      { url: '/code-dark.ico', type: 'image/x-icon', media: '(prefers-color-scheme: dark)' }
    ],
    shortcut: '/favicon.ico',
    apple: '/code-light.ico',
  },
  manifest: '/site.webmanifest',
  verification: {
    google: 'your-google-verification-code', // Add your Google Search Console verification code
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
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
        <StructuredData />
        <ServiceWorker />
        <ThemeToggle />
        <FloatingNav />
        {children}
        <BackToTop />
        <CalendlyScript />
      </body>
    </html>
  );
}

