'use client';

import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    if (dark) html.classList.add("dark");
    else html.classList.remove("dark");
  }, [dark]);

  return (
    <div
      className="fixed top-4 right-4 z-50 flex items-center cursor-pointer"
      onClick={() => setDark(!dark)}
    >
      <div className={`w-14 h-7 rounded-full flex items-center px-1 transition-colors duration-300 ${dark ? 'bg-gray-700' : 'bg-gray-300'}`}>
        <div
          className={`w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center text-sm transition-transform duration-300 
            ${dark ? 'translate-x-7' : 'translate-x-0'}`}
        >
          {dark ? '🌙' : '☀️'}
        </div>
      </div>
    </div>
  );
}
