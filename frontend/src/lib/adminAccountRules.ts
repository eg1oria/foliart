export const ADMIN_USERNAME_MIN_LENGTH = 3;
export const ADMIN_USERNAME_MAX_LENGTH = 32;

// Mirrors the backend: a login is latin or cyrillic, never both, because
// `admin` and `аdmin` with a cyrillic `а` look identical and would otherwise be
// two different accounts. `.`, `-` and `_` are allowed inside, never at an end.
const LATIN_USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])$/;
const CYRILLIC_USERNAME_PATTERN = /^[а-яё0-9](?:[а-яё0-9._-]{1,30}[а-яё0-9])$/;

export const ADMIN_USERNAME_RULE_HINT =
  'Логин: 3–32 символа, латиница или кириллица (без смешивания), цифры, точка, дефис или подчёркивание.';

export const ADMIN_USERNAME_TAKEN_MESSAGE =
  'Администратор с таким логином уже существует.';

// Cyrillic letters have more than one encoding, so the composed form is the one
// that is compared, stored and sent to the backend.
export function normalizeAdminUsername(value: string) {
  return value.normalize('NFC').trim().toLowerCase();
}

export function isAdminUsername(value: string) {
  return LATIN_USERNAME_PATTERN.test(value) || CYRILLIC_USERNAME_PATTERN.test(value);
}

export function getAdminUsernameFormatError(value: string) {
  return isAdminUsername(normalizeAdminUsername(value)) ? null : ADMIN_USERNAME_RULE_HINT;
}

// The form already has the list of logins on the page, so a busy one is
// reported while typing instead of after a round trip.
export function isAdminUsernameTaken(value: string, takenUsernames: readonly string[]) {
  const username = normalizeAdminUsername(value);

  return takenUsernames.some((taken) => normalizeAdminUsername(taken) === username);
}

// Returns the message to show under the field, or null when the login is fine.
export function validateAdminUsername(
  value: string,
  takenUsernames: readonly string[] = [],
) {
  return (
    getAdminUsernameFormatError(value) ??
    (isAdminUsernameTaken(value, takenUsernames) ? ADMIN_USERNAME_TAKEN_MESSAGE : null)
  );
}
