import { getAdminApiHeaders } from '@/lib/adminApi';
import { adminApiFetch } from '@/lib/adminBackend';
import { isAdminAuthenticated } from '@/lib/adminAuthServer';

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const image = formData.get('image');

  if (!(image instanceof File) || image.size === 0) {
    return Response.json({ message: 'Image is required' }, { status: 400 });
  }

  const payload = new FormData();
  payload.append('image', image);

  const response = await adminApiFetch('/api/articles/content-images', {
    method: 'POST',
    headers: getAdminApiHeaders(),
    body: payload,
  });
  const data = (await response.json().catch(() => null)) as {
    imageUrl?: string;
    message?: string | string[];
  } | null;

  if (!response.ok || !data?.imageUrl) {
    return Response.json(
      { message: data?.message ?? 'Image upload failed' },
      { status: response.status },
    );
  }

  return Response.json({
    url: `/media/${data.imageUrl.replace(/^\/+/, '')}`,
  });
}
