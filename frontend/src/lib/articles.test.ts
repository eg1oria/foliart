import { describe, expect, it } from 'vitest';
import { getArticleLocalesById } from './articles';

describe('getArticleLocalesById', () => {
  it('lists only the locales whose article list carries the article', () => {
    const localesById = getArticleLocalesById([
      ['ru', [{ id: 1 }, { id: 2 }]],
      ['en', [{ id: 1 }]],
      ['fr', []],
      ['es', [{ id: 1 }, { id: 3 }]],
    ]);

    expect(localesById.get(1)).toEqual(['ru', 'en', 'es']);
    expect(localesById.get(2)).toEqual(['ru']);
    expect(localesById.get(3)).toEqual(['es']);
    expect(localesById.has(4)).toBe(false);
  });
});
