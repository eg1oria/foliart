'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAdminApiHeaders } from '@/lib/adminApi';
import { adminApiFetch, getAdminApiErrorMessage } from '@/lib/adminBackend';
import { requireAdminSession } from '@/lib/adminAuthServer';
import { getArticleHref } from '@/lib/articles';
import { normalizeContentLocale } from '@/lib/contentLocales';

const articleLocales = ['ru', 'en', 'fr', 'es'] as const;

type ArticleFormPayload = {
  title: string;
  excerpt: string;
  content: string;
  publishedAt: string;
};

function buildAdminRedirectPath(
  locale: string,
  params: Record<string, string | undefined> = {},
  hash?: string,
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();
  return `/${locale}/admin/articles${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
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
    excerpt: normalizeText(formData.get('excerpt')),
    content: normalizeText(formData.get('content')),
    publishedAt: normalizeText(formData.get('publishedAt')),
  };
}

function appendArticlePayload(
  payload: FormData,
  values: ArticleFormPayload,
  contentLocale: string,
) {
  payload.append('contentLocale', contentLocale);
  payload.append('title', values.title);
  payload.append('excerpt', values.excerpt);
  payload.append('content', values.content);
  payload.append('publishedAt', values.publishedAt);
}

async function revalidateArticlePages(args: { articleTitle: string; previousTitle?: string }) {
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
  const contentLocale = normalizeContentLocale(normalizeText(formData.get('contentLocale')));
  await requireAdminSession(locale);

  if (contentLocale !== 'ru') {
    redirect(
      buildAdminRedirectPath(
        locale,
        {
          contentLocale,
          error:
            locale === 'en'
              ? 'Create the Russian version first, then add translations.'
              : 'Сначала создайте русскую версию, затем добавьте переводы.',
        },
        'create-article',
      ),
    );
  }

  const values = getArticleFormPayload(formData);
  const image = formData.get('image');

  if (!values.title || !values.content || !(image instanceof File) || image.size === 0) {
    redirect(
      buildAdminRedirectPath(
        locale,
        {
          contentLocale,
          error:
            locale === 'en'
              ? 'Fill in the article title, content, and cover image.'
              : locale === 'fr'
                ? "Veuillez renseigner le titre, le contenu de l'article et l'image de couverture."
                : 'Заполните заголовок, текст статьи и загрузите обложку.',
        },
        'create-article',
      ),
    );
  }

  const payload = new FormData();
  appendArticlePayload(payload, values, contentLocale);
  payload.append('image', image);

  const response = await adminApiFetch('/api/articles', {
    method: 'POST',
    headers: getAdminApiHeaders(),
    body: payload,
  });

  if (!response.ok) {
    const rawMessage = await getAdminApiErrorMessage(response, locale);

    redirect(
      buildAdminRedirectPath(
        locale,
        {
          contentLocale,
          error:
            rawMessage ||
            (locale === 'en'
              ? 'Failed to create article.'
              : locale === 'fr'
                ? "Impossible de créer l'article."
                : 'Не удалось создать статью.'),
        },
        'create-article',
      ),
    );
  }

  await revalidateArticlePages({
    articleTitle: values.title,
  });

  redirect(
    buildAdminRedirectPath(
      locale,
      {
        contentLocale,
        status: 'created',
      },
      'create-article',
    ),
  );
}

export async function updateArticleAction(formData: FormData) {
  const locale = normalizeLocale(formData.get('locale'));
  const contentLocale = normalizeContentLocale(normalizeText(formData.get('contentLocale')));
  await requireAdminSession(locale);

  const articleId = normalizeText(formData.get('articleId'));
  const previousTitle = normalizeText(formData.get('previousTitle'));
  const values = getArticleFormPayload(formData);
  const image = formData.get('image');

  if (!articleId || !values.title || !values.content) {
    redirect(
      buildAdminRedirectPath(
        locale,
        {
          contentLocale,
          edit: articleId,
          error:
            locale === 'en'
              ? 'Fill in the article title and content.'
              : locale === 'fr'
                ? "Veuillez renseigner le titre et le contenu de l'article."
                : 'Заполните заголовок и текст статьи.',
        },
        articleId ? `article-${articleId}` : 'manage-articles',
      ),
    );
  }

  const payload = new FormData();
  appendArticlePayload(payload, values, contentLocale);

  if (image instanceof File && image.size > 0) {
    payload.append('image', image);
  }

  const response = await adminApiFetch(`/api/articles/${articleId}`, {
    method: 'PATCH',
    headers: getAdminApiHeaders(),
    body: payload,
  });

  if (!response.ok) {
    const rawMessage = await getAdminApiErrorMessage(response, locale);

    redirect(
      buildAdminRedirectPath(
        locale,
        {
          contentLocale,
          edit: articleId,
          error:
            rawMessage ||
            (locale === 'en'
              ? 'Failed to update article.'
              : locale === 'fr'
                ? "Impossible de mettre à jour l'article."
                : 'Не удалось обновить статью.'),
        },
        articleId ? `article-${articleId}` : 'manage-articles',
      ),
    );
  }

  await revalidateArticlePages({
    articleTitle:
      contentLocale === 'ru' || contentLocale === 'fr'
        ? previousTitle || values.title
        : values.title,
    previousTitle,
  });

  redirect(
    buildAdminRedirectPath(
      locale,
      {
        contentLocale,
        status: 'updated',
        article: articleId,
        edit: articleId,
      },
      `article-${articleId}`,
    ),
  );
}

export async function deleteArticleAction(formData: FormData) {
  const locale = normalizeLocale(formData.get('locale'));
  const contentLocale = normalizeContentLocale(normalizeText(formData.get('contentLocale')));
  await requireAdminSession(locale);

  const articleId = normalizeText(formData.get('articleId'));
  const articleTitle = normalizeText(formData.get('articleTitle'));

  if (!articleId || !articleTitle) {
    redirect(
      buildAdminRedirectPath(
        locale,
        {
          contentLocale,
          manageError:
            locale === 'en' ? 'Select an article to delete.' : 'Выберите статью для удаления.',
        },
        'manage-articles',
      ),
    );
  }

  const response = await adminApiFetch(`/api/articles/${articleId}`, {
    method: 'DELETE',
    headers: getAdminApiHeaders(),
  });

  if (!response.ok) {
    const rawMessage = await getAdminApiErrorMessage(response, locale);

    redirect(
      buildAdminRedirectPath(
        locale,
        {
          contentLocale,
          manageError:
            rawMessage ||
            (locale === 'en'
              ? 'Failed to delete article.'
              : locale === 'fr'
                ? "Impossible de supprimer l'article."
                : 'Не удалось удалить статью.'),
        },
        'manage-articles',
      ),
    );
  }

  await revalidateArticlePages({
    articleTitle,
  });

  redirect(
    buildAdminRedirectPath(
      locale,
      {
        contentLocale,
        status: 'deleted',
      },
      'manage-articles',
    ),
  );
}
