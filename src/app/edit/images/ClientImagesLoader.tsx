'use client';

import ImageUploader from '@/components/admin/ImageUploader';
import AdminResource from '@/components/admin/AdminResource';
import { useAdminFetch, selectArray } from '@/hooks/useAdminFetch';

type Assets = Parameters<typeof ImageUploader>[0]['initialAssets'];

export default function ClientImagesLoader() {
  const state = useAdminFetch<Assets>('/api/admin/images', { select: selectArray });

  return (
    <AdminResource state={state} skeletonRows={3}>
      {assets => <ImageUploader initialAssets={assets} />}
    </AdminResource>
  );
}
