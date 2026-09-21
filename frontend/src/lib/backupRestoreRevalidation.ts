import 'server-only';

import { revalidatePath, revalidateTag } from 'next/cache';

import { getUiMessagesTag, uiMessageLocales } from '@/i18n/uiMessages';

import {
  articlesCacheTag,
  calendarsCacheTag,
  categoriesCacheTag,
  partnersCacheTag,
  productsCacheTag,
  regionalContactsCacheTag,
  siteImagesCacheTag,
  socialLinksCacheTag,
} from './api';
import type { LastRestore } from './backups';

const contentCacheTags = [
  articlesCacheTag,
  calendarsCacheTag,
  categoriesCacheTag,
  partnersCacheTag,
  productsCacheTag,
  regionalContactsCacheTag,
  siteImagesCacheTag,
  socialLinksCacheTag,
];

// Older restores were already handled, or served long enough for the regular
// revalidation window to have caught up.
const recentRestoreMs = 60 * 60_000;

let revalidatedRestore: string | null = null;

/**
 * A restore replaces every piece of content at once, so every cached page and
 * API response is dropped — once per restore, however many admins poll the
 * status while it finishes.
 */
export function revalidateSiteAfterRestore(lastRestore: LastRestore | null) {
  if (!lastRestore || lastRestore.status !== 'ok') return false;

  const finishedAt = Date.parse(lastRestore.finishedAt);
  const key = `${lastRestore.archive}@${lastRestore.finishedAt}`;

  if (
    revalidatedRestore === key ||
    !Number.isFinite(finishedAt) ||
    Date.now() - finishedAt > recentRestoreMs
  ) {
    return false;
  }

  revalidatedRestore = key;

  for (const tag of contentCacheTags) {
    revalidateTag(tag, { expire: 0 });
  }

  for (const locale of uiMessageLocales) {
    revalidateTag(getUiMessagesTag(locale), { expire: 0 });
  }

  revalidatePath('/', 'layout');

  return true;
}
