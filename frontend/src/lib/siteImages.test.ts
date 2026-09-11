import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { resolveSiteImage } from './media';
import {
  isSiteImageKey,
  siteImageGroupPaths,
  siteImageKeys,
  siteImageSlots,
  type SiteImageMap,
} from './siteImages';
import { parseAspectRatio } from './siteImageUpload';

describe('site image slots', () => {
  it('keeps every default pointing at a file that ships with the frontend', () => {
    for (const key of siteImageKeys) {
      const { default: defaultPath } = siteImageSlots[key];

      expect(defaultPath.startsWith('/')).toBe(true);
      expect(
        existsSync(join(process.cwd(), 'public', defaultPath.slice(1))),
        `${key} → ${defaultPath}`,
      ).toBe(true);
    }
  });

  it('accepts every key on the backend key mask', () => {
    for (const key of siteImageKeys) {
      expect(key).toMatch(/^[a-z0-9-]{1,64}$/);
    }
  });

  it('describes every slot and gives each group a public page', () => {
    for (const key of siteImageKeys) {
      const slot = siteImageSlots[key];

      expect(slot.label).not.toHaveLength(0);
      expect(slot.hint).not.toHaveLength(0);
      expect(slot.recommended).toMatch(/^\d+×\d+$/);
      expect(parseAspectRatio(slot.aspect)).toBeGreaterThan(0);
      expect(slot.maxDimension).toBeGreaterThanOrEqual(64);
      expect(siteImageGroupPaths[slot.group]).toBeTruthy();
    }
  });

  it('renders the bundled default, with no dimensions, while nothing is stored', () => {
    expect(resolveSiteImage({}, 'home-hero')).toEqual({
      src: '/hero.webp',
      width: null,
      height: null,
    });
  });

  it('rewrites a stored file onto the /media proxy and reports its size', () => {
    const images: SiteImageMap = {
      'home-hero': {
        imageUrl: 'site/1757000000000-home-hero.webp',
        width: 1920,
        height: 1080,
        revision: 1,
        updatedAt: '2026-09-11T10:00:00.000Z',
      },
    };

    expect(resolveSiteImage(images, 'home-hero')).toEqual({
      src: '/media/site/1757000000000-home-hero.webp',
      width: 1920,
      height: 1080,
    });
    // A second slot sharing the same default file stays untouched.
    expect(resolveSiteImage(images, 'home-icon-1').src).toBe('/hero-icon1.webp');
  });

  it('falls back to the default when a stored row has an empty url', () => {
    const images: SiteImageMap = {
      'footer-bg': {
        imageUrl: '',
        width: 0,
        height: 0,
        revision: 1,
        updatedAt: '2026-09-11T10:00:00.000Z',
      },
    };

    expect(resolveSiteImage(images, 'footer-bg').src).toBe('/footer3.webp');
  });

  it('only recognises keys the registry declares', () => {
    expect(isSiteImageKey('home-hero')).toBe(true);
    expect(isSiteImageKey('home-hero-2')).toBe(false);
    expect(isSiteImageKey(null)).toBe(false);
  });
});
