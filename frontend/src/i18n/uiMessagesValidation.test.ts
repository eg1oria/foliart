import { describe, expect, it } from 'vitest';
import {
  getBundledUiMessages,
  uiMessageLocales,
} from './uiMessages';
import { validateEditableUiMessages } from './uiMessagesValidation';

describe('editable UI messages validation', () => {
  const reference = {
    Home: {
      title: 'Hello {name}',
      count: '{count, plural, one {# item} other {# items}}',
      privacy: 'Read <privacy>the policy</privacy>',
      cards: ['First', 'Second'],
    },
  };

  it.each(uiMessageLocales)(
    'accepts every bundled %s document, including all current rich tags',
    (locale) => {
      const bundled = getBundledUiMessages(locale);
      expect(validateEditableUiMessages(bundled, bundled)).toMatchObject({
        ok: true,
      });
    },
  );

  it('accepts translated text with the original structure and ICU signature', () => {
    expect(
      validateEditableUiMessages(reference, {
        Home: {
          title: 'Welcome, {name}',
          count: '{count, plural, one {# result} other {# results}}',
          privacy: 'Open <privacy>privacy</privacy>',
          cards: ['Uno', 'Dos'],
        },
      }),
    ).toMatchObject({ ok: true });
  });

  it('rejects missing keys and changed array lengths', () => {
    const result = validateEditableUiMessages(reference, {
      Home: {
        title: 'Welcome, {name}',
        count: '{count, plural, one {# result} other {# results}}',
        privacy: 'Open <privacy>privacy</privacy>',
        cards: ['Only one'],
      },
    });

    expect(result).toMatchObject({ ok: false });
    if (!result.ok) {
      expect(Object.values(result.fieldErrors)).toContain(
        'Массив Home.cards должен сохранить исходную длину.',
      );
    }
  });

  it('rejects malformed ICU and removed placeholders', () => {
    const malformed = validateEditableUiMessages(reference, {
      ...reference,
      Home: { ...reference.Home, title: 'Welcome, {name' },
    });
    const removed = validateEditableUiMessages(reference, {
      ...reference,
      Home: { ...reference.Home, title: 'Welcome' },
    });

    expect(malformed).toMatchObject({ ok: false });
    expect(removed).toMatchObject({ ok: false });
  });

  it('rejects unbalanced, removed, and unknown rich-text tags', () => {
    for (const privacy of [
      'Open <privacy>privacy',
      'Open privacy',
      'Open <site>privacy</site>',
    ]) {
      expect(
        validateEditableUiMessages(reference, {
          ...reference,
          Home: { ...reference.Home, privacy },
        }),
      ).toMatchObject({ ok: false });
    }
  });
});
