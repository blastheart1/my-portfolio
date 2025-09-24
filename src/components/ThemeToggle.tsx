'use client';

import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setDark(true);
    }
    setMounted(true);
  }, []);

  // Apply theme changes
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

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="fixed top-4 right-4 z-50 w-14 h-7 rounded-full bg-gray-300" />
    );
  }

  return (
    <button
      className="fixed top-4 right-4 z-50 flex items-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full p-1"
      onClick={() => setDark(!dark)}
      aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}
      title={`Switch to ${dark ? 'light' : 'dark'} mode`}
    >
      <div className={`w-14 h-7 rounded-full flex items-center px-1 transition-colors duration-300 ${dark ? 'bg-gray-700' : 'bg-gray-300'}`}>
        <div
          className={`w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center text-sm transition-transform duration-300 
            ${dark ? 'translate-x-7' : 'translate-x-0'}`}
          role="img"
          aria-label={dark ? 'Dark mode active' : 'Light mode active'}
        >
          {dark ? '🌙' : '☀️'}
        </div>
      </div>
    </button>
  );
}
