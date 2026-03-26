import ClientProjectsLoader from './ClientProjectsLoader';

export default function ProjectsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Projects</h1>
        <p className="mt-1 text-sm text-gray-500">
          Add, edit, or remove portfolio projects. Drag order is controlled by <strong>sort_order</strong>.
        </p>
      </div>

      <ClientProjectsLoader />
    </div>
  );
}
