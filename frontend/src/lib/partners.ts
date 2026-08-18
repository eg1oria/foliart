import type { Partner } from './api';

export type PartnerCard = {
  id: number;
  name: string;
  logoUrl: string | null;
  address: string | null;
  phones: Array<{ href: string; label: string }>;
  email: string | null;
  website: { href: string; label: string } | null;
};

function trimmed(value?: string | null) {
  const result = value?.trim();
  return result ? result : null;
}

// `tel:` only understands digits and a leading `+`, while the label keeps the
// spacing an admin typed in.
export function getPhoneHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, '');
  return `tel:${digits.startsWith('+') ? '+' : ''}${digits.replace(/\+/g, '')}`;
}

export function parsePartnerPhones(phones?: string | null) {
  return (phones ?? '')
    .split(/\r?\n/)
    .map((phone) => phone.trim())
    .filter(Boolean)
    .map((phone) => ({ href: getPhoneHref(phone), label: phone }));
}

// An address typed as `ecogreen.ru` still has to become a working link, and the
// label stays exactly as entered.
export function getPartnerWebsite(website?: string | null) {
  const value = trimmed(website);

  if (!value) {
    return null;
  }

  return {
    href: /^https?:\/\//i.test(value) ? value : `https://${value}`,
    label: value,
  };
}

export function toPartnerCard(partner: Partner): PartnerCard {
  return {
    id: partner.id,
    name: partner.name.trim(),
    logoUrl: trimmed(partner.logoUrl),
    address: trimmed(partner.address),
    phones: parsePartnerPhones(partner.phones),
    email: trimmed(partner.email),
    website: getPartnerWebsite(partner.website),
  };
}
