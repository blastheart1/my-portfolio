import { ReactNode } from 'react';
import { AdminProvider } from '@/contexts/AdminContext';
import { ToastProvider } from '@/components/ui/toast';
import AdminSidebar from './AdminSidebar';
import AdminShortcuts from '@/components/admin/AdminShortcuts';

// CONTENT_SECTIONS now lives in @/lib/admin-nav — importing a constant from a
// route module coupled the nav to the layout. Re-exported for any consumer
// that still points here.
export { CONTENT_SECTIONS } from '@/lib/admin-nav';

export default function EditLayout({ children }: { children: ReactNode }) {
  return (
    <AdminProvider>
      <ToastProvider>
        {/* bg-background rather than bg-gray-50/dark:bg-gray-950 — the admin
            derives every colour from the semantic tokens, so light/dark needs
            no per-element variant. */}
        <div className="flex min-h-screen bg-background">
          <AdminSidebar />
          <AdminShortcuts />

          {/* min-w-0 so long content (tables, code) scrolls inside the column
              instead of stretching the flex row. */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* pt-14 clears the fixed mobile top bar; above md the sidebar
                takes over and the bar is gone. */}
            <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-8 pt-[4.5rem] sm:px-6 md:pt-8">
              {children}
            </main>
          </div>
        </div>
      </ToastProvider>
    </AdminProvider>
  );
}
