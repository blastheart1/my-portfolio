import ClientImagesLoader from './ClientImagesLoader';
import ProfilePhotosEditor from '@/components/admin/ProfilePhotosEditor';
import ResumeUploader from '@/components/admin/ResumeUploader';

export default function ImagesPage() {
  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Media</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Profile photos, your resume, and everything else stored on Vercel Blob.
        </p>
      </div>

      <ProfilePhotosEditor />

      <ResumeUploader />

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Media library
        </p>
        <ClientImagesLoader />
      </div>
    </div>
  );
}
