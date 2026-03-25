import { ReactNode } from 'react';
import Link from 'next/link';
import { AdminProvider } from '@/contexts/AdminContext';
import LogoutButton from './LogoutButton';

const NAV_LINKS = [
  { href: '/edit', label: 'Dashboard' },
  { href: '/edit/sections', label: 'Sections' },
  { href: '/edit/content/hero', label: 'Content' },
  { href: '/edit/experience', label: 'Experience' },
  { href: '/edit/images', label: 'Images' },
];

export default function EditLayout({ children }: { children: ReactNode }) {
  return (
    <AdminProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Topbar */}
        <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="mx-auto max-w-7xl px-4 flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <Link href="/edit" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                ✦ Admin
              </Link>
              <nav className="hidden sm:flex items-center gap-1">
                {NAV_LINKS.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-3 py-1.5 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                target="_blank"
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                View site ↗
              </Link>
              <LogoutButton />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto max-w-7xl px-4 py-8">
          {children}
        </main>
      </div>
    </AdminProvider>
  );
}
