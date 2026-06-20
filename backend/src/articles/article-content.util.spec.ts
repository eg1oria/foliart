import {
  sanitizeArticleContent,
  sanitizeArticleExcerpt,
} from './article-content.util';

describe('article content sanitizing', () => {
  it('removes executable markup and protocol-relative links', () => {
    const content = sanitizeArticleContent(
      '<p>Safe</p><script>alert(1)</script><a href="//example.com">link</a>',
    );

    expect(content).toContain('<p>Safe</p>');
    expect(content).not.toContain('script');
    expect(content).not.toContain('href');
  });

  it('creates a bounded plain-text excerpt from rich content', () => {
    const excerpt = sanitizeArticleExcerpt('', `<p>${'word '.repeat(100)}</p>`);

    expect(excerpt.length).toBeLessThanOrEqual(220);
    expect(excerpt.endsWith('...')).toBe(true);
  });
});
