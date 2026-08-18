import { describe, expect, it } from 'vitest';
import {
  createSearchEntries,
  foldSearchText,
  getSearchHighlightParts,
  groupHitsByType,
  isSearchableQuery,
  searchDocuments,
  swapKeyboardLayout,
  type SearchDocument,
} from './search';
import { getStaticSearchDocuments } from './searchPages';

const documents: SearchDocument[] = [
  {
    id: 'product:1',
    type: 'product',
    title: 'ВЕРАЙЗОН',
    href: '/catalog/fitomodulyatory/verayzon',
    description: 'Фитомодулятор для восстановления растений после стресса.',
    context: 'Фитомодуляторы и органо-минеральные комплексы',
    keywords: ['азот 60 г/л, калий 30 г/л'],
  },
  {
    id: 'product:2',
    type: 'product',
    title: 'Zn 160- аминохелат',
    href: '/catalog/monoprodukty/zn-160-aminohelat',
    description: 'Монопродукт с цинком в хелатной форме.',
    context: 'Монопродукты',
    keywords: ['цинк 160 г/л'],
  },
  {
    id: 'category:2',
    type: 'category',
    title: 'Монопродукты',
    href: '/catalog/monoprodukty',
    description: 'Однокомпонентные препараты.',
  },
  {
    id: 'article:1',
    type: 'article',
    title: 'Как увеличить эффективность удобрений',
    href: '/articles/kak-uvelichit-effektivnost-udobreniy',
    description: 'Практические приемы работы с листовыми подкормками.',
    date: '2025-03-01T00:00:00.000Z',
  },
];

function titlesFor(query: string) {
  return searchDocuments(documents, query).map((hit) => hit.document.title);
}

describe('search text folding', () => {
  it('folds case, "ё" and separators into a comparable form', () => {
    expect(foldSearchText('Zn 160- Аминохелат')).toBe('zn 160 аминохелат');
    expect(foldSearchText('Всё о ПОЧВЕ!')).toBe('все о почве');
  });

  it('requires at least two meaningful characters', () => {
    expect(isSearchableQuery(' я ')).toBe(false);
    expect(isSearchableQuery('zn')).toBe(true);
    expect(isSearchableQuery('   ')).toBe(false);
  });

  it('re-types a query typed in the wrong keyboard layout', () => {
    expect(swapKeyboardLayout('ajkbfhn')).toBe('фолиарт');
    expect(swapKeyboardLayout('цинк')).toBe('wbyr');
  });
});

describe('search ranking', () => {
  it('puts the exact title match first', () => {
    expect(titlesFor('верайзон')[0]).toBe('ВЕРАЙЗОН');
  });

  it('suggests products while the title is still being typed', () => {
    expect(titlesFor('вера')[0]).toBe('ВЕРАЙЗОН');
  });

  it('matches transliterated queries in both directions', () => {
    expect(titlesFor('verayzon')[0]).toBe('ВЕРАЙЗОН');
    expect(titlesFor('монопродукты').map((title) => title)).toContain('Монопродукты');
  });

  it('finds a latin product name typed in the russian layout', () => {
    expect(titlesFor('Ят 160')[0]).toBe('Zn 160- аминохелат');
  });

  it('tolerates a single typo in longer words', () => {
    expect(titlesFor('верайзан')[0]).toBe('ВЕРАЙЗОН');
  });

  it('requires every token to match', () => {
    expect(titlesFor('цинк аминохелат')).toEqual(['Zn 160- аминохелат']);
    expect(titlesFor('цинк карбамид')).toEqual([]);
  });

  it('falls back to keywords and descriptions with a lower rank', () => {
    const titles = titlesFor('стресса');
    expect(titles).toEqual(['ВЕРАЙЗОН']);
  });

  it('ranks the category above the product that only mentions it', () => {
    expect(titlesFor('монопродукты')[0]).toBe('Монопродукты');
  });

  it('ignores queries that are too short', () => {
    expect(titlesFor('в')).toEqual([]);
  });

  it('respects the type filter and the limit', () => {
    expect(searchDocuments(documents, 'монопродукты', { types: ['product'] })).toHaveLength(1);
    expect(searchDocuments(documents, 'монопродукты', { limit: 1 })).toHaveLength(1);
  });

  it('groups hits in a stable section order', () => {
    const groups = groupHitsByType(searchDocuments(documents, 'монопродукты'));
    expect(groups.map((group) => group.type)).toEqual(['product', 'category']);
  });
});

describe('static pages in the index', () => {
  it('exposes the same paths for every locale', () => {
    const ruPaths = getStaticSearchDocuments('ru').map((page) => page.href);

    for (const locale of ['en', 'fr', 'es']) {
      expect(getStaticSearchDocuments(locale).map((page) => page.href)).toEqual(ruPaths);
    }
  });

  it('is searchable by its localized title', () => {
    const pages = createSearchEntries(getStaticSearchDocuments('en'));
    const hit = pages.find((entry) => entry.document.href === '/contacts');

    expect(hit).toBeDefined();
    expect(searchDocuments(getStaticSearchDocuments('en'), 'contacts')[0]?.document.href).toBe(
      '/contacts',
    );
  });
});

describe('highlighting', () => {
  it('marks the matched part of a title', () => {
    expect(getSearchHighlightParts('Монопродукты', 'моно')).toEqual([
      { text: 'Моно', matched: true },
      { text: 'продукты', matched: false },
    ]);
  });

  it('leaves the title untouched when nothing matches', () => {
    expect(getSearchHighlightParts('Монопродукты', 'цинк')).toEqual([
      { text: 'Монопродукты', matched: false },
    ]);
  });
});
