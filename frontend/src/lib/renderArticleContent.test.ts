// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { renderArticleContent } from './renderArticleContent';

describe('public article renderer', () => {
  it('renders supported TipTap blocks and sanitizes the result', () => {
    const html = renderArticleContent({
      format: 'tiptap-json',
      schemaVersion: 1,
      document: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 4 }, content: [{ type: 'text', text: 'Heading' }] },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Safe', marks: [{ type: 'bold' }] },
              { type: 'hardBreak' },
              { type: 'text', text: 'Link', marks: [{ type: 'link', attrs: { href: 'https://example.com' } }] },
            ],
          },
        ],
      },
    });
    expect(html).toContain('<h4>Heading</h4>');
    expect(html).toContain('<strong>Safe</strong>');
    expect(html).toContain('rel="noreferrer noopener"');
  });

  it('sanitizes legacy fallback immediately before rendering', () => {
    const html = renderArticleContent({
      format: 'legacy-html',
      html: '<p>Safe</p><script>alert(1)</script><img src="data:image/png;base64,AA" onerror="alert(2)">',
    });
    expect(html).toBe('<p>Safe</p>');
  });
});
