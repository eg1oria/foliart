import { describe, expect, it } from 'vitest';
import { parseAdvantageItems, parseAdvantages } from './catalog';

describe('catalog advantages', () => {
  it('preserves whether each line has an explicit marker', () => {
    expect(
      parseAdvantageItems(
        'Вводный текст без точки.\n• Первое преимущество\n- Второе преимущество\nЕще текст',
      ),
    ).toEqual([
      { text: 'Вводный текст без точки.', hasMarker: false },
      { text: 'Первое преимущество', hasMarker: true },
      { text: 'Второе преимущество', hasMarker: true },
      { text: 'Еще текст', hasMarker: false },
    ]);
  });

  it('keeps the existing text-only parser compatible', () => {
    expect(parseAdvantages('Вводный текст\n• Преимущество')).toEqual([
      'Вводный текст',
      'Преимущество',
    ]);
  });

  it('supports marked and unmarked values from the legacy JSON format', () => {
    expect(parseAdvantageItems('["Обычный текст", "* Преимущество"]')).toEqual([
      { text: 'Обычный текст', hasMarker: false },
      { text: 'Преимущество', hasMarker: true },
    ]);
  });
});
