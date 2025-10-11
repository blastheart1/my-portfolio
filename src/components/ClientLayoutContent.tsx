'use client';

import { useModal } from '@/contexts/ModalContext';
import ThemeToggle from './ThemeToggle';
import BackToTop from './BackToTop';
import FloatingNav from './FloatingNav';
import PortfolioChatbotWrapper from './PortfolioChatbotWrapper';

interface ClientLayoutContentProps {
  children: React.ReactNode;
}

export default function ClientLayoutContent({ children }: ClientLayoutContentProps) {
  const { isModalOpen } = useModal();
  
  return (
    <>
      <ThemeToggle isModalOpen={isModalOpen} />
      <FloatingNav />
      {children}
      <BackToTop isModalOpen={isModalOpen} />
      <PortfolioChatbotWrapper />
    </>
  );
}
