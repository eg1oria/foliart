/**
 * Social network badges in the header and the fullscreen menu. The set is
 * edited per content locale in `/admin/social-links`; this module holds
 * everything both the public badge and the admin form agree on. The header fits
 * `maxSocialLinksInRow` of them and hides the rest behind a dropdown, so the
 * set can grow without the layout moving.
 *
 * The icon keys are mirrored in the backend's `social-links.validation.ts`,
 * which rejects anything outside the list — a key added here without a matching
 * entry there cannot be saved, and one added there without an entry in
 * `socialIcons.ts` would render an empty badge.
 */

export const socialIconKeys = [
  'vk',
  'ok',
  'facebook',
  'telegram',
  'instagram',
  'youtube',
  'whatsapp',
  'tiktok',
  'viber',
  'pinterest',
  'x',
] as const;

export type SocialIconKey = (typeof socialIconKeys)[number];

export const socialIconLabels: Record<SocialIconKey, string> = {
  vk: 'VK',
  ok: 'Одноклассники',
  facebook: 'Facebook',
  telegram: 'Telegram',
  instagram: 'Instagram',
  youtube: 'YouTube',
  whatsapp: 'WhatsApp',
  tiktok: 'TikTok',
  viber: 'Viber',
  pinterest: 'Pinterest',
  x: 'X (Twitter)',
};

/**
 * How many round buttons the header's row is allowed to hold. A set this size
 * or smaller is drawn whole; a bigger one gives the last slot to the `+N`
 * button, so the row keeps its width instead of wrapping onto a second line.
 */
export const maxSocialLinksInRow = 5;

/**
 * An upper bound for one language. The header no longer cares how many rows
 * there are — this only keeps a stuck client from writing an unbounded set.
 */
export const maxSocialLinks = 30;
export const maxSocialLinkLabelLength = 60;
export const maxSocialLinkHrefLength = 500;
/** A text badge shares the round button with the icons, so it stays short. */
export const maxSocialLinkTextLength = 5;

/** A row as the backend stores it. */
export type SocialLink = {
  id: number;
  locale: string;
  label: string;
  href: string;
  icon: string;
  text: string;
  sortOrder: number;
};

/** A badge as the public components render it. */
export type SocialLinkItem = {
  id: string;
  label: string;
  href: string;
  icon?: SocialIconKey;
  text?: string;
};

/**
 * How a set of badges divides between the header's row and its dropdown. The
 * `+N` button takes a slot of its own, so a set that overflows shows one badge
 * fewer than a set that fits exactly — five stay in the row, six become four
 * plus the button.
 */
export function splitSocialLinksForRow<T>(links: T[], slots: number) {
  if (slots <= 0 || links.length <= slots) {
    return { row: links, overflow: [] as T[] };
  }

  return { row: links.slice(0, slots - 1), overflow: links.slice(slots - 1) };
}

export function isSocialIconKey(value: unknown): value is SocialIconKey {
  return socialIconKeys.includes(value as SocialIconKey);
}

/**
 * Rows the header can render, in stored order. A row whose icon key the
 * frontend does not know falls back to its text, and a row with neither is
 * dropped rather than shown as an empty circle.
 */
export function toSocialLinkItems(links: SocialLink[]): SocialLinkItem[] {
  return links
    .map((link): SocialLinkItem => {
      const icon = isSocialIconKey(link.icon) ? link.icon : undefined;
      const text = link.text.trim();

      return {
        id: String(link.id),
        label: link.label.trim() || link.href,
        href: link.href,
        icon,
        text: icon ? undefined : text || undefined,
      };
    })
    .filter((item) => Boolean(item.href) && Boolean(item.icon || item.text));
}

export type SocialLinkFormRow = {
  /** Stable only within one editing session — rows are saved as a whole set. */
  key: string;
  label: string;
  href: string;
  icon: string;
  text: string;
};

export type SocialLinkRowErrors = Partial<Record<'label' | 'href' | 'text', string>>;

export function toSocialLinkFormRows(links: SocialLink[]): SocialLinkFormRow[] {
  return links.map((link) => ({
    key: `link-${link.id}`,
    label: link.label,
    href: link.href,
    icon: isSocialIconKey(link.icon) ? link.icon : '',
    text: link.text,
  }));
}

export function createEmptySocialLinkRow(key: string): SocialLinkFormRow {
  return { key, label: '', href: '', icon: '', text: '' };
}

/**
 * The same rules the backend enforces, run before the request so a typo is
 * reported next to the field instead of as one API error for the whole form.
 */
export function validateSocialLinkRow(row: SocialLinkFormRow): SocialLinkRowErrors {
  const errors: SocialLinkRowErrors = {};
  const label = row.label.trim();
  const href = row.href.trim();
  const text = row.text.trim();

  if (!label) {
    errors.label = 'Введите название сети.';
  } else if (label.length > maxSocialLinkLabelLength) {
    errors.label = `Название длиннее ${maxSocialLinkLabelLength} символов.`;
  }

  if (!href) {
    errors.href = 'Введите ссылку.';
  } else if (href.length > maxSocialLinkHrefLength) {
    errors.href = `Ссылка длиннее ${maxSocialLinkHrefLength} символов.`;
  } else if (!/^https?:\/\/\S+$/i.test(href)) {
    errors.href = 'Ссылка должна начинаться с http:// или https://';
  }

  if (!row.icon) {
    if (!text) {
      errors.text = 'Выберите иконку или введите текст.';
    } else if (text.length > maxSocialLinkTextLength) {
      errors.text = `Не больше ${maxSocialLinkTextLength} символов.`;
    }
  }

  return errors;
}

/** The payload shape `PUT /api/social-links/:locale` expects. */
export function toSocialLinkPayload(rows: SocialLinkFormRow[]) {
  return rows.map((row) => ({
    label: row.label.trim(),
    href: row.href.trim(),
    icon: isSocialIconKey(row.icon) ? row.icon : '',
    text: row.icon ? '' : row.text.trim(),
  }));
}
