import type { RegionalContact } from './api';

export type RegionalContactCard = {
  id: number;
  region: string;
  fullName: string | null;
  phone: { href: string; label: string } | null;
  address: string | null;
};

export type RegionalContactFormField = 'region' | 'sortOrder';

export type RegionalContactFormFieldErrors = Partial<
  Record<RegionalContactFormField, string>
>;

function trimmed(value?: string | null) {
  const result = value?.trim();
  return result ? result : null;
}

// `tel:` only understands digits and a leading `+`; the label keeps the
// spacing an admin typed in.
export function getContactPhoneHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, '');
  return `tel:${digits.startsWith('+') ? '+' : ''}${digits.replace(/\+/g, '')}`;
}

export function toRegionalContactCard(contact: RegionalContact): RegionalContactCard {
  const phone = trimmed(contact.phone);

  return {
    id: contact.id,
    region: contact.region.trim(),
    fullName: trimmed(contact.fullName),
    phone: phone ? { href: getContactPhoneHref(phone), label: phone } : null,
    address: trimmed(contact.address),
  };
}

export function validateRegionalContactForm(input: { region: string; sortOrder: string }) {
  const fieldErrors: RegionalContactFormFieldErrors = {};

  if (!input.region.trim()) {
    fieldErrors.region = 'Введите наименование региона.';
  }

  if (input.sortOrder && !/^-?\d+$/.test(input.sortOrder)) {
    fieldErrors.sortOrder = 'Порядок задаётся целым числом.';
  }

  return fieldErrors;
}
