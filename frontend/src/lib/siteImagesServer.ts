import 'server-only';

import { cache } from 'react';

import { getSiteImages } from './api';
import { resolveSiteImage, type ResolvedSiteImage } from './media';
import type { SiteImageKey, SiteImageMap } from './siteImages';

/**
 * The set is fetched once per render and never allowed to throw: the footer
 * sits in the root layout and the hero is the home page's LCP element, so a
 * backend that is down has to degrade to the bundled files rather than take
 * every page with it.
 */
export const getSiteImageMap = cache(async (): Promise<SiteImageMap> => {
  try {
    return await getSiteImages();
  } catch {
    return {};
  }
});

export async function getSiteImage(key: SiteImageKey): Promise<ResolvedSiteImage> {
  return resolveSiteImage(await getSiteImageMap(), key);
}
