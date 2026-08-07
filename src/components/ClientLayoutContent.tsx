'use client';

import { usePathname } from 'next/navigation';
import { useModal } from '@/contexts/ModalContext';
import { ScrollProvider } from '@/contexts/ScrollContext';
import ThemeToggle from './ThemeToggle';
import BackToTop from './BackToTop';
import FloatingNav from './FloatingNav';
import MobileNav from './MobileNav';
import CustomCursor from './CustomCursor';
import PortfolioChatbotWrapper from './PortfolioChatbotWrapper';
import ChromeReveal from './ChromeReveal';

interface ClientLayoutContentProps {
  children: React.ReactNode;
}

/**
 * Public-site chrome.
 *
 * /edit renders inside the root layout, so before this gate the admin also
 * mounted the floating nav, the mobile bottom bar, back-to-top, a second
 * theme toggle, the chatbot launcher — and CustomCursor, which sets
 * `cursor: none !important` on <html> and left the admin with no pointer at
 * all. They overlapped the sidebar and competed with its own controls.
 *
 * The admin has its own shell (src/app/edit/layout.tsx) and wants none of it.
 */
export default function ClientLayoutContent({ children }: ClientLayoutContentProps) {
  const { isModalOpen } = useModal();
  const pathname = usePathname();

  // Exact '/edit' or a child of it. A bare startsWith('/edit') would also
  // capture a future '/editorial' and silently strip its chrome.
  const isAdmin = pathname === '/edit' || (pathname?.startsWith('/edit/') ?? false);

  if (isAdmin) {
    // ScrollProvider stays: it is a passive context with no visual output, and
    // dropping it would break any descendant that calls useScrollY().
    return <ScrollProvider>{children}</ScrollProvider>;
  }

  // Only the home page carries the cosmic hero, so only there does the chrome
  // wait. ChromeReveal still confirms against the DOM on mount, since the hero
  // section can be switched off from the admin.
  const expectHero = pathname === '/';

  return (
    <ScrollProvider>
      <CustomCursor />
      <ChromeReveal expectHero={expectHero}>
        <ThemeToggle isModalOpen={isModalOpen} />
        <FloatingNav />
        <MobileNav />
      </ChromeReveal>
      {children}
      <BackToTop isModalOpen={isModalOpen} />
      {/* Kept in its own wrapper so the launcher stays after {children} in DOM
          order, which is what puts it above the page content. */}
      <ChromeReveal expectHero={expectHero}>
        <PortfolioChatbotWrapper />
      </ChromeReveal>
    </ScrollProvider>
  );
}
