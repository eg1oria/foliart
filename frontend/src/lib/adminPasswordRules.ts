export const ADMIN_PASSWORD_MIN_LENGTH = 10;

// Mirrors the backend bounds so the form can answer without a round trip; the
// backend still validates every password it is handed.
export function validateNewPassword(newPassword: string, confirmPassword: string) {
  const fieldErrors: Record<string, string> = {};

  if (newPassword.length < ADMIN_PASSWORD_MIN_LENGTH) {
    fieldErrors.newPassword = `Пароль должен быть не короче ${ADMIN_PASSWORD_MIN_LENGTH} символов.`;
  }

  if (newPassword !== confirmPassword) {
    fieldErrors.confirmPassword = 'Пароли не совпадают.';
  }

  return fieldErrors;
}
