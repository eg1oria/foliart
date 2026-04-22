'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getArticleHref } from '@/lib/articles';

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3001';
const articleLocales = ['ru', 'en'] as const;

type ArticleFormPayload = {
  title: string;
  titleEn: string;
  excerpt: string;
  excerptEn: string;
  content: string;
  contentEn: string;
  publishedAt: string;
};

function buildAdminRedirectPath(
  locale: string,
  params: Record<string, string | undefined> = {},
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();
  return `/${locale}/admin/articles${query ? `?${query}` : ''}`;
}

function normalizeLocale(value: FormDataEntryValue | null) {
  return typeof value === 'string' && value ? value : 'ru';
}

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function getArticleFormPayload(formData: FormData): ArticleFormPayload {
  return {
    title: normalizeText(formData.get('title')),
    titleEn: normalizeText(formData.get('titleEn')),
    excerpt: normalizeText(formData.get('excerpt')),
    excerptEn: normalizeText(formData.get('excerptEn')),
    content: normalizeText(formData.get('content')),
    contentEn: normalizeText(formData.get('contentEn')),
    publishedAt: normalizeText(formData.get('publishedAt')),
  };
}

function appendArticlePayload(payload: FormData, values: ArticleFormPayload) {
  payload.append('title', values.title);
  payload.append('titleEn', values.titleEn);
  payload.append('excerpt', values.excerpt);
  payload.append('excerptEn', values.excerptEn);
  payload.append('content', values.content);
  payload.append('contentEn', values.contentEn);
  payload.append('publishedAt', values.publishedAt);
}

async function getRequestErrorMessage(response: Response) {
  const errorPayload = (await response.json().catch(() => null)) as
    | { message?: string | string[] }
    | null;

  return Array.isArray(errorPayload?.message)
    ? errorPayload.message.join(', ')
    : errorPayload?.message;
}

async function revalidateArticlePages(args: {
  articleTitle: string;
  previousTitle?: string;
}) {
  const { articleTitle, previousTitle } = args;

  for (const locale of articleLocales) {
    revalidatePath(`/${locale}/articles`);
    revalidatePath(`/${locale}/admin/articles`);
    revalidatePath(`/${locale}${getArticleHref({ title: articleTitle })}`);

    if (previousTitle) {
      revalidatePath(`/${locale}${getArticleHref({ title: previousTitle })}`);
    }
  }
}

export async function createArticleAction(formData: FormData) {
  const locale = normalizeLocale(formData.get('locale'));
  const values = getArticleFormPayload(formData);
  const image = formData.get('image');

  if (!values.title || !values.content || !(image instanceof File) || image.size === 0) {
    redirect(
      buildAdminRedirectPath(locale, {
        error:
          locale === 'en'
            ? 'Fill in the article title, content, and cover image.'
            : 'Заполните заголовок, текст статьи и загрузите обложку.',
      }),
    );
  }

  const payload = new FormData();
  appendArticlePayload(payload, values);
  payload.append('image', image);

  const response = await fetch(`${backendUrl}/api/articles`, {
    method: 'POST',
    body: payload,
    cache: 'no-store',
  });

  if (!response.ok) {
    const rawMessage = await getRequestErrorMessage(response);

    redirect(
      buildAdminRedirectPath(locale, {
        error:
          rawMessage ||
          (locale === 'en' ? 'Failed to create article.' : 'Не удалось создать статью.'),
      }),
    );
  }

  await revalidateArticlePages({
    articleTitle: values.title,
  });

  redirect(
    buildAdminRedirectPath(locale, {
      status: 'created',
    }),
  );
}

export async function updateArticleAction(formData: FormData) {
  const locale = normalizeLocale(formData.get('locale'));
  const articleId = normalizeText(formData.get('articleId'));
  const previousTitle = normalizeText(formData.get('previousTitle'));
  const values = getArticleFormPayload(formData);
  const image = formData.get('image');

  if (!articleId || !values.title || !values.content) {
    redirect(
      buildAdminRedirectPath(locale, {
        edit: articleId,
        error:
          locale === 'en'
            ? 'Fill in the article title and content.'
            : 'Заполните заголовок и текст статьи.',
      }),
    );
  }

  const payload = new FormData();
  appendArticlePayload(payload, values);

  if (image instanceof File && image.size > 0) {
    payload.append('image', image);
  }

  const response = await fetch(`${backendUrl}/api/articles/${articleId}`, {
    method: 'PATCH',
    body: payload,
    cache: 'no-store',
  });

  if (!response.ok) {
    const rawMessage = await getRequestErrorMessage(response);

    redirect(
      buildAdminRedirectPath(locale, {
        edit: articleId,
        error:
          rawMessage ||
          (locale === 'en' ? 'Failed to update article.' : 'Не удалось обновить статью.'),
      }),
    );
  }

  await revalidateArticlePages({
    articleTitle: values.title,
    previousTitle,
  });

  redirect(
    buildAdminRedirectPath(locale, {
      status: 'updated',
      article: articleId,
      edit: articleId,
    }),
  );
}
