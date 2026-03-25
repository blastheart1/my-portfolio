import ClientServicesLoader from './ClientServicesLoader';

export default function ServicesPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Services</h1>
        <p className="mt-1 text-sm text-gray-500">
          Edit your service tiers. Click a tier to expand and edit. Markdown formatting is supported in tagline and outcome fields.
        </p>
      </div>
      <ClientServicesLoader />
    </div>
  );
}
