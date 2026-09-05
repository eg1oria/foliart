export const ADMIN_PASSWORD_MAX_LENGTH = 200;
export const ADMIN_GENERATED_PASSWORD_LENGTH = 20;

// Ambiguous glyphs (0/O, 1/l/I) are left out: a generated password is read out
// loud or retyped at least once before it reaches its owner.
const PASSWORD_CHARACTER_GROUPS = [
  'abcdefghijkmnpqrstuvwxyz',
  'ABCDEFGHJKLMNPQRSTUVWXYZ',
  '23456789',
  '-_.!?@#',
] as const;

// Any password is accepted, short ones included; only an empty password and one
// past the length the backend stores are refused. The backend applies the same
// two bounds to everything it is handed.
export function validateNewPassword(newPassword: string, confirmPassword: string) {
  const fieldErrors: Record<string, string> = {};

  if (!newPassword) {
    fieldErrors.newPassword = 'Введите пароль.';
  } else if (newPassword.length > ADMIN_PASSWORD_MAX_LENGTH) {
    fieldErrors.newPassword = `Пароль должен быть не длиннее ${ADMIN_PASSWORD_MAX_LENGTH} символов.`;
  }

  if (newPassword !== confirmPassword) {
    fieldErrors.confirmPassword = 'Пароли не совпадают.';
  }

  return fieldErrors;
}

// Values from the tail of the 32-bit range would make the first
// `2^32 % limit` characters of the alphabet more likely, so they are drawn
// again instead of folded in.
function randomIndex(limit: number) {
  const buffer = new Uint32Array(1);
  const ceiling = Math.floor(0x1_0000_0000 / limit) * limit;

  for (;;) {
    crypto.getRandomValues(buffer);

    if (buffer[0] < ceiling) {
      return buffer[0] % limit;
    }
  }
}

export function generateAdminPassword(length = ADMIN_GENERATED_PASSWORD_LENGTH) {
  const alphabet = PASSWORD_CHARACTER_GROUPS.join('');
  const characters = PASSWORD_CHARACTER_GROUPS.map(
    (group) => group[randomIndex(group.length)],
  );

  while (characters.length < length) {
    characters.push(alphabet[randomIndex(alphabet.length)]);
  }

  // Without the shuffle the first characters would always follow the order of
  // the groups above.
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swap = randomIndex(index + 1);
    [characters[index], characters[swap]] = [characters[swap], characters[index]];
  }

  return characters.join('');
}
