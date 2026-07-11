import {
  getArticleDocumentMediaIds,
  hasPendingArticleUploads,
  normalizeArticleDocument,
} from './article-content-json';

const imageId = 'd87ed781-53f8-4a20-90f3-927c75ef7842';

describe('TipTap article JSON contract', () => {
  it('accepts every supported block and mark', () => {
    const document = normalizeArticleDocument({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 4 },
          content: [{ type: 'text', text: 'Heading' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Bold', marks: [{ type: 'bold' }] },
            { type: 'hardBreak' },
            {
              type: 'text',
              text: 'Link',
              marks: [{ type: 'link', attrs: { href: '/catalog' } }],
            },
          ],
        },
        {
          type: 'blockquote',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Quote' }] },
          ],
        },
        {
          type: 'orderedList',
          attrs: { start: 1 },
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Item' }],
                },
              ],
            },
          ],
        },
        {
          type: 'image',
          attrs: {
            mediaId: imageId,
            src: `/media/articles/media/${imageId}/original.webp`,
            alt: 'Leaf',
            width: 800,
            height: 600,
          },
        },
      ],
    });
    expect(getArticleDocumentMediaIds(document)).toEqual(new Set([imageId]));
  });

  it.each([
    [{ type: 'doc', content: [{ type: 'script' }] }, 'not allowed'],
    [
      {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'X',
                marks: [
                  { type: 'link', attrs: { href: 'javascript:alert(1)' } },
                ],
              },
            ],
          },
        ],
      },
      'unsafe',
    ],
    [
      {
        type: 'doc',
        content: [
          { type: 'image', attrs: { src: 'data:image/png;base64,AA==' } },
        ],
      },
      'internal media URL',
    ],
    [
      { type: 'doc', content: [{ type: 'paragraph', evil: true }] },
      'not allowed',
    ],
  ])('rejects unsafe or unknown content', (value, message) => {
    expect(() => normalizeArticleDocument(value)).toThrow(message);
  });

  it('allows upload placeholders only in drafts', () => {
    const value = {
      type: 'doc',
      content: [
        { type: 'imageUpload', attrs: { uploadId: imageId, alt: 'Leaf' } },
      ],
    };
    const draft = normalizeArticleDocument(value, {
      allowPendingUploads: true,
    });
    expect(hasPendingArticleUploads(draft)).toBe(true);
    expect(() => normalizeArticleDocument(value)).toThrow('not allowed');
  });
});
