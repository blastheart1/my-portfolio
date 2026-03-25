import ClientImagesLoader from './ClientImagesLoader';

export default function ImagesPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Images</h1>
        <p className="mt-1 text-sm text-gray-500">Upload and manage media assets stored on Vercel Blob.</p>
      </div>

      <ClientImagesLoader />
    </div>
  );
}
