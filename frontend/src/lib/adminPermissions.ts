export const adminSections = [
  'products',
  'articles',
  'calendars',
  'partners',
  'contacts',
  'messages',
] as const;
export const adminAccessLevels = ['none', 'view', 'manage'] as const;

export type AdminSection = (typeof adminSections)[number];
export type AdminAccessLevel = (typeof adminAccessLevels)[number];
export type AdminPermissions = Record<AdminSection, AdminAccessLevel>;

export type AdminSessionUser = {
  id: number;
  isSuperAdmin: boolean;
  permissions: AdminPermissions;
  username: string;
};

export const adminSectionLabels: Record<AdminSection, string> = {
  products: 'Товары',
  articles: 'Статьи',
  calendars: 'Календарь',
  partners: 'Партнёры',
  contacts: 'Контакты',
  messages: 'Переводы',
};

export const adminAccessLevelLabels: Record<AdminAccessLevel, string> = {
  none: 'Нет доступа',
  view: 'Только просмотр',
  manage: 'Полный доступ',
};

export const adminSectionPaths: Record<AdminSection, string> = {
  products: '/admin/products',
  articles: '/admin/articles',
  calendars: '/admin/calendars',
  partners: '/admin/partners',
  contacts: '/admin/contacts',
  messages: '/admin/messages',
};

export function isAdminSection(value: unknown): value is AdminSection {
  return adminSections.includes(value as AdminSection);
}

export function isAdminAccessLevel(value: unknown): value is AdminAccessLevel {
  return adminAccessLevels.includes(value as AdminAccessLevel);
}

export function createAdminPermissions(level: AdminAccessLevel): AdminPermissions {
  return adminSections.reduce<AdminPermissions>((accumulator, section) => {
    accumulator[section] = level;
    return accumulator;
  }, {} as AdminPermissions);
}

// Mirrors `normalizeAdminPermissions` in the backend: unknown keys are dropped
// and a missing section means no access at all.
export function normalizeAdminPermissions(value: unknown): AdminPermissions {
  const source =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return adminSections.reduce<AdminPermissions>((accumulator, section) => {
    const level = source[section];
    accumulator[section] = isAdminAccessLevel(level) ? level : 'none';
    return accumulator;
  }, {} as AdminPermissions);
}

export function getAdminAccessLevel(
  user: AdminSessionUser,
  section: AdminSection,
): AdminAccessLevel {
  return user.isSuperAdmin ? 'manage' : user.permissions[section];
}

export function canViewSection(user: AdminSessionUser, section: AdminSection) {
  return getAdminAccessLevel(user, section) !== 'none';
}

export function canManageSection(user: AdminSessionUser, section: AdminSection) {
  return getAdminAccessLevel(user, section) === 'manage';
}

export function hasAdminAccessLevel(
  user: AdminSessionUser,
  section: AdminSection,
  level: Exclude<AdminAccessLevel, 'none'>,
) {
  return level === 'manage' ? canManageSection(user, section) : canViewSection(user, section);
}

export function getVisibleAdminSections(user: AdminSessionUser) {
  return adminSections.filter((section) => canViewSection(user, section));
}

export function getFirstAllowedSection(user: AdminSessionUser): AdminSection | null {
  return getVisibleAdminSections(user)[0] ?? null;
}
