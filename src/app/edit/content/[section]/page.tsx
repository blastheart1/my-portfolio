import ContentEditor from '@/components/admin/ContentEditor';
import Link from 'next/link';

const SECTIONS = ['hero', 'about', 'experience', 'skills', 'projects', 'services', 'blog', 'contact'];

interface Props {
  params: Promise<{ section: string }>;
}

async function fetchContent(section: string): Promise<Record<string, string>> {
  // Server-side fetch using internal API (absolute URL not available in RSC without headers)
  // We'll pass empty defaults and let the client editor hydrate from the API.
  return {};
}

export default async function ContentPage({ params }: Props) {
  const { section } = await params;

  if (!SECTIONS.includes(section)) {
    return (
      <div className="max-w-2xl">
        <p className="text-sm text-red-500">Unknown section: {section}</p>
      </div>
    );
  }

  const initialFields = await fetchContent(section);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 capitalize">
            {section}
          </h1>
          <p className="mt-1 text-sm text-gray-500">Edit content fields for this section.</p>
        </div>
      </div>

      {/* Section nav */}
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map(s => (
          <Link
            key={s}
            href={`/edit/content/${s}`}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              s === section
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      <ClientContentEditor section={section} />
    </div>
  );
}

// Client wrapper that fetches via API on mount
import ClientContentEditor from './ClientContentEditor';
