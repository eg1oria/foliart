import type { JSONContent } from '@tiptap/core';
import { normalizeArticleDocument } from './article-content-json';

export const ARTICLE_IMAGE_LAYOUT_VERSION = 1;

export type ArticleImagePlacement = {
  key: string;
  ratio: number;
  order: number;
  node: JSONContent;
};

export type ArticleImageLayout = {
  version: 1;
  placements: ArticleImagePlacement[];
};

function imageKey(node: JSONContent) {
  const mediaId =
    typeof node.attrs?.mediaId === 'string' ? node.attrs.mediaId : '';
  const src = typeof node.attrs?.src === 'string' ? node.attrs.src : '';
  return mediaId || src;
}

export function createArticleImageLayout(
  documents: Array<JSONContent | null | undefined>,
  options: { allowPendingUploads?: boolean } = {},
): ArticleImageLayout {
  const placements: ArticleImagePlacement[] = [];
  const seen = new Set<string>();

  for (const rawDocument of documents) {
    if (!rawDocument) continue;
    const document = normalizeArticleDocument(rawDocument, options);
    const blocks = document.content ?? [];
    const textBlockCount = blocks.filter(
      (node) => node.type !== 'image',
    ).length;
    let blocksBefore = 0;

    for (const node of blocks) {
      if (node.type !== 'image') {
        blocksBefore += 1;
        continue;
      }
      const key = imageKey(node);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      placements.push({
        key,
        ratio: textBlockCount ? blocksBefore / textBlockCount : 0,
        order: placements.length,
        node,
      });
    }
  }

  return { version: ARTICLE_IMAGE_LAYOUT_VERSION, placements };
}

export function normalizeArticleImageLayout(
  value: unknown,
): ArticleImageLayout {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { version: ARTICLE_IMAGE_LAYOUT_VERSION, placements: [] };
  }
  const raw = value as { version?: unknown; placements?: unknown };
  if (
    raw.version !== ARTICLE_IMAGE_LAYOUT_VERSION ||
    !Array.isArray(raw.placements)
  ) {
    return { version: ARTICLE_IMAGE_LAYOUT_VERSION, placements: [] };
  }
  const placements: ArticleImagePlacement[] = [];
  const seen = new Set<string>();
  for (const [index, entry] of raw.placements.slice(0, 100).entries()) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const placement = entry as Record<string, unknown>;
    const ratio = Number(placement.ratio);
    const document = normalizeArticleDocument({
      type: 'doc',
      content: [placement.node],
    });
    const node = document.content?.[0];
    if (node?.type !== 'image' || !Number.isFinite(ratio)) continue;
    const key = imageKey(node);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    placements.push({
      key,
      ratio: Math.max(0, Math.min(1, ratio)),
      order: Number.isInteger(placement.order)
        ? Number(placement.order)
        : index,
      node,
    });
  }
  return { version: ARTICLE_IMAGE_LAYOUT_VERSION, placements };
}

export function applyArticleImageLayout(
  rawDocument: JSONContent,
  rawLayout: unknown,
  options: { allowPendingUploads?: boolean } = {},
): JSONContent {
  const document = normalizeArticleDocument(rawDocument, options);
  const layout = normalizeArticleImageLayout(rawLayout);
  const blocks = (document.content ?? []).filter(
    (node) => node.type !== 'image',
  );
  const merged = [...blocks];
  let inserted = 0;

  for (const placement of [...layout.placements].sort(
    (left, right) => left.ratio - right.ratio || left.order - right.order,
  )) {
    const target = Math.max(
      0,
      Math.min(blocks.length, Math.round(placement.ratio * blocks.length)),
    );
    merged.splice(target + inserted, 0, placement.node);
    inserted += 1;
  }

  return { type: 'doc', content: merged };
}

export function articleImageLayoutsEqual(left: unknown, right: unknown) {
  return (
    JSON.stringify(normalizeArticleImageLayout(left)) ===
    JSON.stringify(normalizeArticleImageLayout(right))
  );
}
