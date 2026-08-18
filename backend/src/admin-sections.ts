export const ADMIN_SECTIONS = [
  'products',
  'articles',
  'calendars',
  'messages',
] as const;

export const ADMIN_ACCESS_LEVELS = ['none', 'view', 'manage'] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];
export type AdminAccessLevel = (typeof ADMIN_ACCESS_LEVELS)[number];
export type AdminPermissions = Record<AdminSection, AdminAccessLevel>;

export function isAdminSection(value: unknown): value is AdminSection {
  return ADMIN_SECTIONS.includes(value as AdminSection);
}

export function isAdminAccessLevel(value: unknown): value is AdminAccessLevel {
  return ADMIN_ACCESS_LEVELS.includes(value as AdminAccessLevel);
}

export function createAdminPermissions(
  level: AdminAccessLevel,
): AdminPermissions {
  return ADMIN_SECTIONS.reduce<AdminPermissions>((accumulator, section) => {
    accumulator[section] = level;
    return accumulator;
  }, {} as AdminPermissions);
}

// Unknown keys are dropped and missing sections fall back to `none`, so a
// stored document keeps working after the section list changes.
export function normalizeAdminPermissions(value: unknown): AdminPermissions {
  const source =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return ADMIN_SECTIONS.reduce<AdminPermissions>((accumulator, section) => {
    const level = source[section];
    accumulator[section] = isAdminAccessLevel(level) ? level : 'none';
    return accumulator;
  }, {} as AdminPermissions);
}
