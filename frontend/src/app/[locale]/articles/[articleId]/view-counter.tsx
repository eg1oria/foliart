'use client';

import { useEffect, useRef, useState } from 'react';

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
