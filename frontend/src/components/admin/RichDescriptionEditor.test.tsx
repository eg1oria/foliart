// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import RichDescriptionEditor from './RichDescriptionEditor';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('RichDescriptionEditor', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('makes line labels before colons bold with one action', async () => {
    await act(async () => {
      root.render(
        <RichDescriptionEditor
          defaultValue={[
            'Описание: Жидкое органоминеральное удобрение.',
            'Применение: Для чувствительных культур.',
            'Преимущества: Оптимальное усвоение меди.',
          ].join('\n')}
          label="Описание"
        />,
      );
    });

    const button = container.querySelector<HTMLButtonElement>('[aria-label="Подписи жирным"]');
    expect(button).not.toBeNull();
    expect(button?.disabled).toBe(false);

    await act(async () => {
      button?.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const value = container.querySelector<HTMLInputElement>('input[name="description"]')?.value;
    expect(container.querySelector('.ProseMirror')?.innerHTML).toContain(
      '<strong>Описание:</strong>',
    );
    expect(value).toContain('<strong>Описание:</strong>');
    expect(value).toContain('<strong>Применение:</strong>');
    expect(value).toContain('<strong>Преимущества:</strong>');
  });
});
