import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { renderRichDescription, sanitizeRichDescription } from './renderRichDescription';
import {
  plainTextToRichDescriptionHtml,
  prepareRichDescriptionHtml,
  richDescriptionToPlainText,
} from './richDescription';

describe('rich descriptions', () => {
  it('turns existing plain text into paragraphs without interpreting HTML', () => {
    expect(plainTextToRichDescriptionHtml('Первый <текст>\nстрока\n\nВторой')).toBe(
      '<p>Первый &lt;текст&gt;<br>строка</p><p>Второй</p>',
    );
    expect(prepareRichDescriptionHtml('Обычное описание')).toBe('<p>Обычное описание</p>');
  });

  it('returns clean text for previews and metadata', () => {
    expect(
      richDescriptionToPlainText('<p>Первый <strong>важный</strong></p><p>Второй &amp; третий</p>'),
    ).toBe('Первый важный Второй & третий');
  });

  it('keeps only paragraphs, line breaks, and bold formatting', () => {
    const value = sanitizeRichDescription(
      '<div onclick="alert(1)">Текст <b style="color:red">жирный</b><script>alert(1)</script><em>обычный</em></div>',
    );

    expect(value).toContain('<p>Текст <strong>жирный</strong>обычный</p>');
    expect(value).not.toContain('onclick');
    expect(value).not.toContain('script');
    expect(value).not.toContain('style');
    expect(renderRichDescription('Первая строка\n\nВторая')).toBe(
      '<p>Первая строка</p><p>Вторая</p>',
    );
  });

  it('normalizes visually empty editor values to an empty string', () => {
    expect(sanitizeRichDescription('<p><br></p>')).toBe('');
  });
});
