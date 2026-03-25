'use client';

import { useModal } from '@/contexts/ModalContext';
import { ScrollProvider } from '@/contexts/ScrollContext';
import ThemeToggle from './ThemeToggle';
import BackToTop from './BackToTop';
import FloatingNav from './FloatingNav';
import MobileNav from './MobileNav';
import CustomCursor from './CustomCursor';
import PortfolioChatbotWrapper from './PortfolioChatbotWrapper';

interface ClientLayoutContentProps {
  children: React.ReactNode;
}

export default function ClientLayoutContent({ children }: ClientLayoutContentProps) {
  const { isModalOpen } = useModal();

  return (
    <ScrollProvider>
      <CustomCursor />
      <ThemeToggle isModalOpen={isModalOpen} />
      <FloatingNav />
      <MobileNav />
      {children}
      <BackToTop isModalOpen={isModalOpen} />
      <PortfolioChatbotWrapper />
    </ScrollProvider>
  );
}
