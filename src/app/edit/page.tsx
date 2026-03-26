import Link from 'next/link';

const TILES = [
  {
    href: '/edit/sections',
    title: 'Sections',
    desc: 'Toggle visibility and reorder page sections.',
    icon: '⊞',
  },
  {
    href: '/edit/content/hero',
    title: 'Content',
    desc: 'Edit text and copy for each section.',
    icon: '✏',
  },
  {
    href: '/edit/experience',
    title: 'Experience',
    desc: 'Manage branching timeline entries.',
    icon: '◈',
  },
  {
    href: '/edit/projects',
    title: 'Projects',
    desc: 'Add, edit, and remove portfolio projects.',
    icon: '◧',
  },
  {
    href: '/edit/images',
    title: 'Images',
    desc: 'Upload and manage media assets.',
    icon: '⊡',
  },
  {
    href: '/edit/chatbot',
    title: 'Chatbot',
    desc: 'AI provider config, learned examples, and conversation logs.',
    icon: '◎',
  },
];

export default function EditDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your portfolio content.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TILES.map(tile => (
          <Link
            key={tile.href}
            href={tile.href}
            className="group rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm transition-all"
          >
            <span className="text-2xl">{tile.icon}</span>
            <h2 className="mt-3 font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
              {tile.title}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{tile.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
