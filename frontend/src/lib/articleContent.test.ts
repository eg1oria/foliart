import { describe, expect, it } from 'vitest';

import {
  isInternalArticleImageSource,
  sanitizeArticleDocumentImages,
} from './articleContent';

describe('article content images', () => {
  it('accepts only article media paths supported by the backend', () => {
    expect(
      isInternalArticleImageSource(
        '/media/articles/media/d87ed781-53f8-4a20-90f3-927c75ef7842/original.webp',
      ),
    ).toBe(true);
    expect(
      isInternalArticleImageSource(
        '/media/articles/content/1782367511660-09003191-57da-4ecf-b7c6-1738c051a484.webp',
      ),
    ).toBe(true);
    expect(isInternalArticleImageSource('https://example.com/image.webp')).toBe(false);
    expect(isInternalArticleImageSource('blob:https://foliart.me/image-id')).toBe(false);
  });

  it('replaces external images while preserving internal and pending images', () => {
    const result = sanitizeArticleDocumentImages({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Before' }] },
        { type: 'image', attrs: { src: 'https://example.com/image.webp' } },
        {
          type: 'image',
          attrs: {
            src: '/media/articles/media/d87ed781-53f8-4a20-90f3-927c75ef7842/original.webp',
          },
        },
        { type: 'imageUpload', attrs: { uploadId: 'upload-id' } },
      ],
    });

    expect(result.removedImages).toBe(1);
    expect(result.document.content?.map((node) => node.type)).toEqual([
      'paragraph',
      'paragraph',
      'image',
      'imageUpload',
    ]);
  });
});
