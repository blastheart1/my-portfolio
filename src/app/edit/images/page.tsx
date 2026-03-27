import ClientImagesLoader from './ClientImagesLoader';
import ProfilePhotosEditor from '@/components/admin/ProfilePhotosEditor';

export default function ImagesPage() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Images</h1>
        <p className="mt-1 text-sm text-gray-500">Upload and manage media assets stored on Vercel Blob.</p>
      </div>

      <ProfilePhotosEditor />

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Media Library</p>
        <ClientImagesLoader />
      </div>
    </div>
  );
}
