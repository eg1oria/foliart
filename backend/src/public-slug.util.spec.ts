import { createUniquePublicSlug, slugifyPublicName } from './public-slug.util';

describe('public slug utilities', () => {
  it('matches the existing public transliteration format', () => {
    expect(slugifyPublicName('Сахарная свёкла')).toBe('saharnaya-svyokla');
    expect(slugifyPublicName('  Calcium & Boron  ')).toBe('calcium-boron');
  });

  it('adds the first available numeric suffix on a collision', async () => {
    const occupied = new Set(['riza', 'riza-2']);

    await expect(
      createUniquePublicSlug('Риза', (candidate) =>
        Promise.resolve(occupied.has(candidate)),
      ),
    ).resolves.toBe('riza-3');
  });
});
