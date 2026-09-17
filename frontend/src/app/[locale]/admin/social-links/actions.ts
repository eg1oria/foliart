'use server';

import { revalidatePath, updateTag } from 'next/cache';

import { getAdminApiHeaders } from '@/lib/adminApi';
import { isSupportedAdminLocale } from '@/lib/adminAuth';
import { requireAdminSection } from '@/lib/adminAuthServer';
import { adminApiFetch, getAdminApiErrorMessage } from '@/lib/adminBackend';
import { socialLinksCacheTag } from '@/lib/api';
import { contentLocales, normalizeContentLocale } from '@/lib/contentLocales';
import {
  maxSocialLinks,
  toSocialLinkPayload,
  validateSocialLinkRow,
  type SocialLinkFormRow,
} from '@/lib/socialLinks';

export type SocialLinksActionState = {
  /** Keyed by the editor's row key, so an error lands on its own row. */
  rowErrors?: Record<string, Record<string, string>>;
  message?: string;
  status: 'idle' | 'success' | 'error';
};

export type SocialLinksActionInput = {
  adminLocale: string;
  rows: SocialLinkFormRow[];
  targetLocale: string;
};

function getAdminLocale(value: string) {
  return isSupportedAdminLocale(value) ? value : 'ru';
}

/**
 * The badges live in the header, which every public page renders through the
 * locale layout, so a save refreshes the whole layout for that language.
 */
function revalidateSocialLinks(targetLocale: string) {
  updateTag(socialLinksCacheTag);

  for (const locale of contentLocales) {
    revalidatePath(`/${locale}`, 'layout');
  }

  revalidatePath(`/${targetLocale}/admin/social-links`);
}

export async function saveSocialLinksAction(
  _previousState: SocialLinksActionState,
  input: SocialLinksActionInput,
): Promise<SocialLinksActionState> {
  const adminLocale = getAdminLocale(input.adminLocale);
  await requireAdminSection(adminLocale, 'social-links', 'manage');

  const targetLocale = normalizeContentLocale(input.targetLocale);
  const rows = Array.isArray(input.rows) ? input.rows : [];

  if (rows.length > maxSocialLinks) {
    return {
      status: 'error',
      message: `Можно сохранить не больше ${maxSocialLinks} ссылок на язык.`,
    };
  }

  const rowErrors: Record<string, Record<string, string>> = {};
  for (const row of rows) {
    const errors = validateSocialLinkRow(row);
    if (Object.keys(errors).length) {
      rowErrors[row.key] = errors;
    }
  }

  if (Object.keys(rowErrors).length) {
    return { status: 'error', message: 'Проверьте заполненные поля.', rowErrors };
  }

  const response = await adminApiFetch(`/api/social-links/${targetLocale}`, {
    method: 'PUT',
    headers: { ...getAdminApiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ links: toSocialLinkPayload(rows) }),
  });

  if (!response.ok) {
    return {
      status: 'error',
      message:
        (await getAdminApiErrorMessage(response, adminLocale)) ||
        'Не удалось сохранить ссылки.',
    };
  }

  revalidateSocialLinks(targetLocale);

  return { status: 'success', message: 'Ссылки сохранены.' };
}
