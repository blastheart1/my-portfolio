import ExperienceEditor from '@/components/admin/ExperienceEditor';

export default function ExperiencePage() {

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Experience</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage timeline entries. Use <strong>tracks</strong> (main, freelance, volunteer, education) to show parallel paths.
        </p>
      </div>

      <ClientExperienceLoader />
    </div>
  );
}

import ClientExperienceLoader from './ClientExperienceLoader';
