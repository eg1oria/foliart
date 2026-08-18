import { describe, expect, it } from 'vitest';

import type { RegionalContact } from './api';
import {
  getContactPhoneHref,
  toRegionalContactCard,
  validateRegionalContactForm,
} from './regionalContacts';

function contact(overrides: Partial<RegionalContact> = {}): RegionalContact {
  return {
    id: 1,
    region: 'Краснодарский край',
    fullName: 'Иванов Иван Иванович',
    phone: '+7 (861) 224-75-37',
    address: '350072, г. Краснодар, ул. Солнечная, 10/3',
    sortOrder: 0,
    ...overrides,
  };
}

describe('regional contacts', () => {
  it('strips formatting from the tel: target but keeps the printed number', () => {
    expect(getContactPhoneHref('+7 (861) 224-75-37')).toBe('tel:+78612247537');
    expect(toRegionalContactCard(contact()).phone).toEqual({
      href: 'tel:+78612247537',
      label: '+7 (861) 224-75-37',
    });
  });

  // Blank fields are what the card drops entirely, so they have to arrive as
  // `null` rather than as an empty string that still renders a row.
  it('reports every empty detail as missing', () => {
    expect(toRegionalContactCard(contact({ fullName: '', phone: '  ', address: '' }))).toEqual({
      id: 1,
      region: 'Краснодарский край',
      fullName: null,
      phone: null,
      address: null,
    });
  });

  it('requires the region and an integer order', () => {
    expect(validateRegionalContactForm({ region: 'Крым', sortOrder: '' })).toEqual({});
    expect(validateRegionalContactForm({ region: '  ', sortOrder: '0' }).region).toBeDefined();
    expect(validateRegionalContactForm({ region: 'Крым', sortOrder: '1,5' }).sortOrder).toBeDefined();
  });
});
