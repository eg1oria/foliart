import { revalidatePath, revalidateTag } from 'next/cache';
import { isAdminAuthenticated } from '@/lib/adminAuthServer';
import { getAdminApiHeaders } from '@/lib/adminApi';
import { adminApiFetch } from '@/lib/adminBackend';

type Context = { params: Promise<{ path?: string[] }> };

function getPublishedArticleIdentity(responseBody: ArrayBuffer) {
  try {
    const value = JSON.parse(new TextDecoder().decode(responseBody)) as {
      id?: unknown;
      slug?: unknown;
    };
    return {
      id:
        typeof value.id === 'number' && Number.isInteger(value.id) && value.id > 0
          ? value.id
          : null,
      slug:
        typeof value.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug)
          ? value.slug
          : null,
    };
  } catch {
    return { id: null, slug: null };
  }
}

async function proxy(request: Request, context: Context) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { path = [] } = await context.params;
  if (path.some((segment) => !/^[a-z0-9-]+$/i.test(segment))) {
    return Response.json({ message: 'Invalid draft path' }, { status: 400 });
  }

  const headers: Record<string, string> = { ...getAdminApiHeaders() };
  let body: BodyInit | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('multipart/form-data')) {
      body = await request.formData();
    } else {
      headers['content-type'] = 'application/json';
      body = await request.text();
    }
  }

  const response = await adminApiFetch(`/api/articles/drafts${path.length ? `/${path.join('/')}` : ''}`, {
    method: request.method,
    headers,
    body,
  });
  const responseBody = await response.arrayBuffer();

  if (response.ok && path.at(-1) === 'publish') {
    const article = getPublishedArticleIdentity(responseBody);
    // A publish must be visible immediately in every locale. The `max` profile
    // serves stale data once, which made another locale look unchanged until it
    // was saved separately.
    revalidateTag('articles', { expire: 0 });
    for (const locale of ['ru', 'en', 'fr', 'es']) {
      revalidatePath(`/${locale}/articles`);
      revalidatePath(`/${locale}/admin/articles`);
      if (article.slug) revalidatePath(`/${locale}/articles/${article.slug}`);
      if (article.id) revalidatePath(`/${locale}/articles/${article.id}`);
    }
    revalidatePath('/sitemap.xml');
  }

  return new Response(responseBody, {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') ?? 'application/json',
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
