export type PartnerFormField = 'name' | 'email' | 'website' | 'logo' | 'sortOrder';

export type PartnerFormFieldErrors = Partial<Record<PartnerFormField, string>>;

export type PartnerFormValidationInput = {
  email: string;
  logoError?: string | null;
  name: string;
  sortOrder: string;
  website: string;
};

// Deliberately loose: the point is to catch a typo like a missing `@`, not to
// re-implement the address grammar. Every field except the name may stay empty
// — the public card just leaves that line out.
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validatePartnerForm(input: PartnerFormValidationInput) {
  const fieldErrors: PartnerFormFieldErrors = {};

  if (!input.name.trim()) {
    fieldErrors.name = 'Введите наименование партнёра.';
  }

  if (input.email && !emailPattern.test(input.email)) {
    fieldErrors.email = 'Укажите корректный e-mail или оставьте поле пустым.';
  }

  if (input.website && /\s/.test(input.website)) {
    fieldErrors.website = 'Адрес сайта не должен содержать пробелов.';
  }

  if (input.sortOrder && !/^-?\d+$/.test(input.sortOrder)) {
    fieldErrors.sortOrder = 'Порядок задаётся целым числом.';
  }

  if (input.logoError) {
    fieldErrors.logo = input.logoError;
  }

  return fieldErrors;
}
