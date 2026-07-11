'use client';

import { useEffect, useState } from 'react';

type DraftSummary = {
  id: string;
  articleId: number | null;
  locale: string;
  title: string;
  updatedAt: string;
};

export default function ArticleDraftResumeList({
  contentLocale,
  locale,
}: {
  contentLocale: string;
  locale: string;
}) {
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);

  useEffect(() => {
    void fetch('/admin-api/article-drafts', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : []))
      .then((value: unknown) => {
        if (Array.isArray(value)) {
          setDrafts(
            (value as DraftSummary[]).filter(
              (draft) => draft.articleId === null && draft.locale === contentLocale,
            ),
          );
        }
      })
      .catch(() => undefined);
  }, [contentLocale]);

  if (!drafts.length) return null;

  return (
    <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900">
        {locale === 'ru' ? 'Незавершённые черновики' : 'Unfinished drafts'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {drafts.map((draft) => (
          <a
            key={draft.id}
            href={`/${locale}/admin/articles/new?contentLocale=${contentLocale}&draft=${draft.id}`}
            className="rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-amber-900"
          >
            {draft.title || (locale === 'ru' ? 'Без названия' : 'Untitled')} ·{' '}
            {new Date(draft.updatedAt).toLocaleString(locale)}
          </a>
        ))}
      </div>
    </div>
  );
}
