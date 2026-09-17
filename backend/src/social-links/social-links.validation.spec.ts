import { BadRequestException } from '@nestjs/common';
import {
  parseSocialLinkLocale,
  parseSocialLinksWriteBody,
} from './social-links.validation';

const iconLink = {
  label: 'VK',
  href: 'https://vk.com/foliart',
  icon: 'vk',
  text: '',
};
const textLink = {
  label: 'Dzen',
  href: 'https://dzen.ru/foliart',
  icon: '',
  text: 'DZ',
};

describe('parseSocialLinkLocale', () => {
  it('accepts the supported locales', () => {
    expect(parseSocialLinkLocale('ru')).toBe('ru');
    expect(parseSocialLinkLocale('es')).toBe('es');
  });

  it.each(['', 'de', 'RU', '../ru'])('rejects %p', (value) => {
    expect(() => parseSocialLinkLocale(value)).toThrow(BadRequestException);
  });
});

describe('parseSocialLinksWriteBody', () => {
  it('keeps an icon badge and a text badge', () => {
    expect(parseSocialLinksWriteBody({ links: [iconLink, textLink] })).toEqual([
      iconLink,
      textLink,
    ]);
  });

  it('accepts an empty list, which hides the block for that language', () => {
    expect(parseSocialLinksWriteBody({ links: [] })).toEqual([]);
  });

  it('drops leftover text once an icon is picked', () => {
    expect(
      parseSocialLinksWriteBody({ links: [{ ...iconLink, text: 'VK' }] }),
    ).toEqual([iconLink]);
  });

  it('trims the fields it stores', () => {
    expect(
      parseSocialLinksWriteBody({
        links: [
          { label: '  Dzen ', href: ' https://dzen.ru/foliart ', text: ' DZ ' },
        ],
      }),
    ).toEqual([textLink]);
  });

  it.each([
    ['a body without links', {}],
    ['a non-array links field', { links: 'vk' }],
    [
      'more than five links',
      { links: Array.from({ length: 6 }, () => iconLink) },
    ],
    ['a missing label', { links: [{ ...iconLink, label: '' }] }],
    ['a missing address', { links: [{ ...iconLink, href: '' }] }],
    ['a relative address', { links: [{ ...iconLink, href: '/vk' }] }],
    [
      'a javascript address',
      { links: [{ ...iconLink, href: 'javascript:alert(1)' }] },
    ],
    ['an unknown icon', { links: [{ ...iconLink, icon: 'myspace' }] }],
    [
      'neither an icon nor text',
      { links: [{ ...iconLink, icon: '', text: '' }] },
    ],
    [
      'a text badge over five characters',
      { links: [{ ...textLink, text: 'FOLIART' }] },
    ],
  ])('rejects %s', (_label, body) => {
    expect(() => parseSocialLinksWriteBody(body)).toThrow(BadRequestException);
  });
});
