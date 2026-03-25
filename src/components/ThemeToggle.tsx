'use client';

import { useState, useEffect } from "react";

interface ThemeToggleProps {
  isModalOpen?: boolean;
}

export default function ThemeToggle({ isModalOpen = false }: ThemeToggleProps) {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) setDark(true);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const html = document.documentElement;
    if (dark) {
      html.classList.add("dark");
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.remove("dark");
      localStorage.setItem('theme', 'light');
    }
  }, [dark, mounted]);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY < 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!mounted) return (
    <div className={`fixed top-4 right-4 z-50 w-14 h-7 rounded-full bg-gray-300 ${isModalOpen ? 'hidden' : ''}`} />
  );

  return (
    <button
      className={`fixed top-4 right-4 z-50 flex items-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 rounded-full p-1 transition-opacity duration-300 ${isModalOpen ? 'hidden' : ''}`}
      style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
      onClick={() => setDark(!dark)}
      aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}
    >
      <div className={`w-14 h-7 rounded-full flex items-center px-1 transition-colors duration-300 ${dark ? 'bg-gray-700' : 'bg-gray-300'}`}>
        <div className={`w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center text-sm transition-transform duration-300 ${dark ? 'translate-x-7' : 'translate-x-0'}`}>
          {dark ? '🌙' : '☀️'}
        </div>
      </div>
    </button>
  );
}
