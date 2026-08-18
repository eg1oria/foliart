import { describe, expect, it } from 'vitest';

import { validatePartnerForm } from './partnerAdmin';

function input(overrides: Partial<Parameters<typeof validatePartnerForm>[0]> = {}) {
  return {
    email: '',
    name: 'ООО "ЭкоГрин"',
    sortOrder: '0',
    website: '',
    ...overrides,
  };
}

describe('partner form validation', () => {
  it('accepts a partner with nothing but a name', () => {
    expect(validatePartnerForm(input({ sortOrder: '' }))).toEqual({});
  });

  it('requires the name', () => {
    expect(validatePartnerForm(input({ name: '   ' })).name).toBeDefined();
  });

  it('rejects a malformed e-mail, an address with spaces and a non-integer order', () => {
    const errors = validatePartnerForm(
      input({ email: 'info(at)ecogreen.ru', website: 'eco green.ru', sortOrder: '1.5' }),
    );

    expect(Object.keys(errors).sort()).toEqual(['email', 'sortOrder', 'website']);
  });

  it('passes the image error through as the logo field error', () => {
    expect(validatePartnerForm(input({ logoError: 'Слишком большой файл.' })).logo).toBe(
      'Слишком большой файл.',
    );
  });
});
