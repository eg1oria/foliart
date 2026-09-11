import { BadRequestException } from '@nestjs/common';
import { parseSiteImageKey } from './site-images.validation';

describe('parseSiteImageKey', () => {
  it('accepts the registry key shape', () => {
    expect(parseSiteImageKey('home-hero')).toBe('home-hero');
    expect(parseSiteImageKey('home-advantage-1')).toBe('home-advantage-1');
  });

  it.each([
    ['an empty key', ''],
    ['uppercase', 'Home-Hero'],
    ['an underscore', 'home_hero'],
    ['a path traversal attempt', '../../etc/passwd'],
    ['a slash', 'home/hero'],
    ['a dot', 'home.hero'],
    ['a key over 64 characters', 'a'.repeat(65)],
  ])('rejects %s', (_label, value) => {
    expect(() => parseSiteImageKey(value)).toThrow(BadRequestException);
  });
});
