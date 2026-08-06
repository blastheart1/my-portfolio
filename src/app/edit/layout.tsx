import { ReactNode } from 'react';
import { AdminProvider } from '@/contexts/AdminContext';
import { ToastProvider } from '@/components/ui/toast';
import AdminNav from './AdminNav';

// CONTENT_SECTIONS now lives in @/lib/admin-nav — importing a constant from a
// route module coupled the nav to the layout. Re-exported for any consumer
// that still points here.
export { CONTENT_SECTIONS } from '@/lib/admin-nav';

export default function EditLayout({ children }: { children: ReactNode }) {
  return (
    <AdminProvider>
      <ToastProvider>
        {/* bg-background rather than bg-gray-50/dark:bg-gray-950 — the admin
            now derives every colour from the semantic tokens, so light/dark
            needs no per-element variant. */}
        <div className="min-h-screen bg-background">
          <AdminNav />
          <main className="mx-auto max-w-7xl px-4 py-8">
            {children}
          </main>
        </div>
      </ToastProvider>
    </AdminProvider>
  );
}
