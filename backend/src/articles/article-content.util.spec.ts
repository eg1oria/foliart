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

  it('keeps uploaded article images between paragraphs', () => {
    const content = sanitizeArticleContent(
      '<p>Before</p><img src="/media/articles/content/photo-1.webp" alt="Leaf" onerror="alert(1)"><p>After</p>',
    );

    expect(content).toContain('<p>Before</p>');
    expect(content).toContain(
      '<img src="/media/articles/content/photo-1.webp" alt="Leaf" />',
    );
    expect(content).toContain('<p>After</p>');
    expect(content).not.toContain('onerror');
  });

  it('removes images outside the article upload directory', () => {
    const content = sanitizeArticleContent(
      '<p>Safe</p><img src="https://example.com/tracker.png" alt="Tracker">',
    );

    expect(content).toBe('<p>Safe</p>');
  });
});
