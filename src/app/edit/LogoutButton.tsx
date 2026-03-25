'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.push('/edit/login');
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="text-xs text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
    >
      Sign out
    </button>
  );
}
