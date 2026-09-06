'use client';

import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'foliart:viewed-articles';
const VIEW_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_STORED_ARTICLES = 200;

type ViewedArticles = Record<string, number>;

function readViewedArticles(): ViewedArticles | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        ([, timestamp]) => typeof timestamp === 'number' && Number.isFinite(timestamp),
      ) as [string, number][],
    );
  } catch {
    // Storage is unavailable (private mode, disabled cookies) or holds invalid data.
    return null;
  }
}

function writeViewedArticles(viewed: ViewedArticles) {
  try {
    const entries = Object.entries(viewed)
      .sort(([, a], [, b]) => b - a)
      .slice(0, MAX_STORED_ARTICLES);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Ignore storage write failures — the view is still counted for this visit.
  }
}

export default function ArticleViewCounter({
  articleId,
  initialCount,
}: {
  articleId: number;
  initialCount: number;
}) {
  const [count, setCount] = useState(initialCount);
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (hasTrackedRef.current) {
      return;
    }

    hasTrackedRef.current = true;

    const now = Date.now();
    const key = String(articleId);
    const viewed = readViewedArticles();

    if (viewed) {
      const lastViewedAt = viewed[key];

      if (typeof lastViewedAt === 'number' && now - lastViewedAt < VIEW_TTL_MS) {
        return;
      }

      const fresh = Object.fromEntries(
        Object.entries(viewed).filter(([, timestamp]) => now - timestamp < VIEW_TTL_MS),
      );

      writeViewedArticles({ ...fresh, [key]: now });
    }

    const controller = new AbortController();

    void fetch(`/api/articles/${articleId}/views`, {
      method: 'POST',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        return (await response.json()) as { viewCount?: number } | null;
      })
      .then((payload) => {
        if (typeof payload?.viewCount === 'number') {
          setCount(payload.viewCount);
        }
      })
      .catch(() => {
        // Keep the initial counter value when tracking fails.
      });

    return () => controller.abort();
  }, [articleId]);

  return <span>{count}</span>;
}
