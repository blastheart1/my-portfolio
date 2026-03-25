'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from './LogoutButton';
import { CONTENT_SECTIONS } from './layout';

const TOP_LINKS = [
  { href: '/edit',              label: 'Dashboard',  match: (p: string) => p === '/edit' },
  { href: '/edit/sections',     label: 'Sections',   match: (p: string) => p === '/edit/sections' },
  { href: '/edit/content/hero', label: 'Content',    match: (p: string) => p.startsWith('/edit/content') },
  { href: '/edit/experience',   label: 'Experience', match: (p: string) => p === '/edit/experience' },
  { href: '/edit/services',     label: 'Services',   match: (p: string) => p === '/edit/services' },
  { href: '/edit/images',       label: 'Images',     match: (p: string) => p === '/edit/images' },
];

export default function AdminNav() {
  const pathname = usePathname();
  const isContent = pathname.startsWith('/edit/content');
  const activeSection = isContent ? pathname.split('/')[3] : null;

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      {/* Main nav row */}
      <div className="mx-auto max-w-7xl px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <Link href="/edit" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            ✦ Admin
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {TOP_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  link.match(pathname)
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" target="_blank" className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            View site ↗
          </Link>
          <LogoutButton />
        </div>
      </div>

      {/* Section tabs — only visible on /edit/content/* */}
      {isContent && (
        <div className="mx-auto max-w-7xl px-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide">
            {CONTENT_SECTIONS.map(s => (
              <Link
                key={s}
                href={`/edit/content/${s}`}
                className={`px-4 py-2.5 text-xs font-medium capitalize whitespace-nowrap border-b-2 transition-colors ${
                  s === activeSection
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
