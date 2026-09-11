'use client';

import { createContext, use, type ReactNode } from 'react';

import { resolveSiteImage, type ResolvedSiteImage } from '@/lib/media';
import type { SiteImageKey, SiteImageMap } from '@/lib/siteImages';

const SiteImagesContext = createContext<SiteImageMap>({});

/**
 * Only `ContactModalTrigger` reads a slot from the client, and it is mounted
 * from both the header and the fullscreen menu — a context in the layout is
 * cheaper than threading a prop through everything in between.
 */
export function SiteImagesProvider({
  children,
  images,
}: {
  children: ReactNode;
  images: SiteImageMap;
}) {
  return <SiteImagesContext value={images}>{children}</SiteImagesContext>;
}

export function useSiteImage(key: SiteImageKey): ResolvedSiteImage {
  return resolveSiteImage(use(SiteImagesContext), key);
}
