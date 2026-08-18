// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UiMessagesActionState } from '@/app/[locale]/admin/messages/actions';
import { getUiMessagePathId } from '@/i18n/uiMessages';

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  reset: vi.fn(),
  save: vi.fn(),
}));

vi.mock('@/i18n/routing', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock('@/app/[locale]/admin/messages/actions', () => ({
  resetUiMessagesAction: mocks.reset,
  saveUiMessagesAction: mocks.save,
}));

import UiMessagesEditor from './UiMessagesEditor';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const messages = {
  Home: {
    title: 'Original title',
  },
};

function changeInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('UiMessagesEditor', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.save.mockResolvedValue({ status: 'idle' });
    mocks.reset.mockResolvedValue({ status: 'idle' });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <UiMessagesEditor
          canManage
          adminLocale="ru"
          bundledMessages={messages}
          hasOverride={false}
          initialMessages={messages}
          revision={0}
          russianMessages={messages}
          targetLocale="en"
          updatedAt={null}
        />,
      );
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('tracks dirty, saving, and successful states without duplicate submit', async () => {
    let finish:
      | ((state: UiMessagesActionState) => void)
      | undefined;
    mocks.save.mockImplementationOnce(
      () =>
        new Promise<UiMessagesActionState>((resolve) => {
          finish = resolve;
        }),
    );
    const input = container.querySelector<HTMLInputElement>(
      '#ui-message-value-0',
    )!;
    const saveButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button'),
    ).find((button) => button.textContent?.includes('Сохранить изменения'))!;
    expect(saveButton.disabled).toBe(true);

    await act(async () => changeInput(input, 'Changed title'));
    expect(container.textContent).toContain('Есть несохранённые изменения');
    expect(saveButton.disabled).toBe(false);

    await act(async () => {
      saveButton.click();
      await Promise.resolve();
    });
    expect(container.textContent).toContain('Сохранение…');
    expect(saveButton.disabled).toBe(true);
    saveButton.click();
    expect(mocks.save).toHaveBeenCalledTimes(1);

    await act(async () => {
      finish?.({
        status: 'success',
        message: 'Переводы сохранены и кеш сайта обновлён.',
        revision: 1,
        updatedAt: '2026-07-26T12:00:00.000Z',
      });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(container.textContent).toContain(
      'Переводы сохранены и кеш сайта обновлён.',
    );
    expect(container.textContent).toContain('Revision');
    expect(container.textContent).toContain('1');
    expect(saveButton.disabled).toBe(true);
  });

  it('keeps entered text and focuses the field after a validation error', async () => {
    mocks.save.mockResolvedValueOnce({
      status: 'error',
      message: 'Исправьте отмеченные строки перед сохранением.',
      fieldErrors: {
        [getUiMessagePathId(['Home', 'title'])]: 'Некорректный ICU-синтаксис.',
      },
    });
    const input = container.querySelector<HTMLInputElement>(
      '#ui-message-value-0',
    )!;

    await act(async () => {
      changeInput(input, 'Broken value');
      container
        .querySelector<HTMLFormElement>('form')
        ?.requestSubmit();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(input.value).toBe('Broken value');
    expect(container.textContent).toContain('Некорректный ICU-синтаксис');
    expect(document.activeElement).toBe(input);
  });

  it('preserves dirty values and offers reload after a revision conflict', async () => {
    mocks.save.mockResolvedValueOnce({
      status: 'conflict',
      message: 'Переводы уже изменены в другой сессии.',
    });
    const input = container.querySelector<HTMLInputElement>(
      '#ui-message-value-0',
    )!;

    await act(async () => {
      changeInput(input, 'My unsaved value');
      container
        .querySelector<HTMLFormElement>('form')
        ?.requestSubmit();
      await Promise.resolve();
    });

    expect(input.value).toBe('My unsaved value');
    expect(container.textContent).toContain(
      'Переводы уже изменены в другой сессии.',
    );
    const reload = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button'),
    ).find((button) =>
      button.textContent?.includes('Загрузить актуальную версию'),
    );
    expect(reload).toBeDefined();
  });

  it('requires explicit confirmation before resetting to bundled messages', async () => {
    await act(async () => {
      root.render(
        <UiMessagesEditor
          canManage
          key="stored-override"
          adminLocale="ru"
          bundledMessages={messages}
          hasOverride
          initialMessages={{ Home: { title: 'Stored title' } }}
          revision={2}
          russianMessages={messages}
          targetLocale="en"
          updatedAt="2026-07-26T12:00:00.000Z"
        />,
      );
    });
    const resetButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button'),
    ).find((button) => button.textContent?.includes('Сбросить язык'))!;
    vi.mocked(window.confirm).mockReturnValueOnce(false);

    await act(async () => resetButton.click());
    expect(mocks.reset).not.toHaveBeenCalled();

    vi.mocked(window.confirm).mockReturnValueOnce(true);
    mocks.reset.mockResolvedValueOnce({
      status: 'success',
      message: 'Язык сброшен к встроенной версии.',
      revision: 3,
      updatedAt: '2026-07-26T13:00:00.000Z',
    });
    await act(async () => {
      resetButton.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mocks.reset).toHaveBeenCalledTimes(1);
    expect(
      container.querySelector<HTMLInputElement>('#ui-message-value-0')?.value,
    ).toBe('Original title');
    expect(container.textContent).toContain(
      'Язык сброшен к встроенной версии.',
    );
  });
});
