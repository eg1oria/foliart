import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import {
  parseUiMessageLocale,
  parseUiMessageResetBody,
  parseUiMessageWriteBody,
} from './ui-messages.validation';

describe('UI messages validation', () => {
  it.each(['ru', 'en', 'fr', 'es'])('accepts locale %s', (locale) => {
    expect(parseUiMessageLocale(locale)).toBe(locale);
  });

  it('rejects unsupported locales', () => {
    expect(() => parseUiMessageLocale('de')).toThrow(BadRequestException);
  });

  it('accepts nested objects, arrays, and string leaves', () => {
    expect(
      parseUiMessageWriteBody({
        expectedRevision: 3,
        messages: {
          Home: {
            title: 'Title',
            cards: [{ label: 'First' }, { label: 'Second' }],
          },
        },
      }),
    ).toEqual({
      expectedRevision: 3,
      messages: {
        Home: {
          title: 'Title',
          cards: [{ label: 'First' }, { label: 'Second' }],
        },
      },
    });
  });

  it.each([null, true, 12, { value: null }, { value: false }])(
    'rejects non-string leaves in %p',
    (messages) => {
      expect(() =>
        parseUiMessageWriteBody({ expectedRevision: 0, messages }),
      ).toThrow(BadRequestException);
    },
  );

  it('rejects prototype-pollution keys from parsed JSON', () => {
    const body = JSON.parse(
      '{"expectedRevision":0,"messages":{"safe":"ok","__proto__":{"polluted":"yes"}}}',
    ) as unknown;

    expect(() => parseUiMessageWriteBody(body)).toThrow(
      'UI messages contain a forbidden key',
    );
    expect(({} as { polluted?: string }).polluted).toBeUndefined();
  });

  it('rejects objects with a non-standard prototype', () => {
    const messages = Object.create({ inherited: 'unsafe' }) as Record<
      string,
      unknown
    >;
    messages.safe = 'ok';

    expect(() =>
      parseUiMessageWriteBody({ expectedRevision: 0, messages }),
    ).toThrow('messages must be a JSON object');
  });

  it('rejects payloads larger than 256 KiB', () => {
    expect(() =>
      parseUiMessageWriteBody({
        expectedRevision: 0,
        messages: { value: 'x'.repeat(256 * 1024) },
      }),
    ).toThrow(PayloadTooLargeException);
  });

  it('rejects excessive depth and node counts', () => {
    let deep: unknown = 'leaf';
    for (let depth = 0; depth < 22; depth += 1) {
      deep = { child: deep };
    }
    expect(() =>
      parseUiMessageWriteBody({
        expectedRevision: 0,
        messages: deep,
      }),
    ).toThrow('UI messages are nested too deeply');

    const wide = Object.fromEntries(
      Array.from({ length: 1_000 }, (_, index) => [
        `section${index}`,
        Array.from({ length: 10 }, () => 'value'),
      ]),
    );
    expect(() =>
      parseUiMessageWriteBody({
        expectedRevision: 0,
        messages: wide,
      }),
    ).toThrow('UI messages contain too many elements');
  });

  it('rejects invalid revisions and extra request fields', () => {
    expect(() =>
      parseUiMessageWriteBody({
        expectedRevision: -1,
        messages: { value: 'ok' },
      }),
    ).toThrow('expectedRevision must be a non-negative integer');
    expect(() =>
      parseUiMessageWriteBody({
        expectedRevision: 0,
        messages: { value: 'ok' },
        locale: 'ru',
      }),
    ).toThrow('Request body contains unsupported fields');
  });

  it('accepts only expectedRevision for reset', () => {
    expect(parseUiMessageResetBody({ expectedRevision: 4 })).toEqual({
      expectedRevision: 4,
    });
    expect(() =>
      parseUiMessageResetBody({
        expectedRevision: 4,
        messages: {},
      }),
    ).toThrow('Request body contains unsupported fields');
  });
});
