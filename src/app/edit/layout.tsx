import { ReactNode } from 'react';
import Link from 'next/link';
import { AdminProvider } from '@/contexts/AdminContext';
import LogoutButton from './LogoutButton';
import AdminNav from './AdminNav';

export const CONTENT_SECTIONS = [
  'hero', 'about', 'experience', 'skills',
  'projects', 'services', 'blog', 'contact',
];

export default function EditLayout({ children }: { children: ReactNode }) {
  return (
    <AdminProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <AdminNav />
        <main className="mx-auto max-w-7xl px-4 py-8">
          {children}
        </main>
      </div>
    </AdminProvider>
  );
}
