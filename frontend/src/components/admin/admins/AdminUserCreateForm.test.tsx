// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock('@/app/[locale]/admin/admins/actions', () => ({
  createAdminUserAction: mocks.create,
}));
vi.mock('@/i18n/routing', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import AdminUserCreateForm from './AdminUserCreateForm';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

function changeInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('AdminUserCreateForm', () => {
  let container: HTMLDivElement;
  let root: Root;

  function button(label: string) {
    return Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
      (candidate) => candidate.textContent?.includes(label),
    )!;
  }

  function passwordInputs() {
    return [
      container.querySelector<HTMLInputElement>('[name="password"]')!,
      container.querySelector<HTMLInputElement>('[name="confirmPassword"]')!,
    ];
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.create.mockResolvedValue({ status: 'idle' });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root.render(<AdminUserCreateForm locale="ru" takenUsernames={['editor']} />);
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('fills both fields with one generated password and reveals it', async () => {
    await act(async () => button('Сгенерировать пароль').click());

    const [password, confirmPassword] = passwordInputs();

    expect(password.value).toHaveLength(20);
    expect(confirmPassword.value).toBe(password.value);
    expect(password.type).toBe('text');
  });

  it('accepts a short password', async () => {
    const [password, confirmPassword] = passwordInputs();

    await act(async () => changeInput(password, '12'));
    await act(async () => changeInput(confirmPassword, '12'));

    expect(container.textContent).not.toContain('Введите пароль.');
    expect(container.textContent).not.toContain('Пароли не совпадают.');
    expect(button('Создать администратора').disabled).toBe(false);
  });

  it('hides the password again on demand', async () => {
    await act(async () => button('Сгенерировать пароль').click());
    await act(async () => button('Скрыть').click());

    expect(passwordInputs()[0].type).toBe('password');
  });

  it('applies an access preset to every section', async () => {
    await act(async () => button('Всё — полный доступ').click());

    const checked = container.querySelectorAll('input[type="radio"]:checked');

    expect(checked).toHaveLength(6);
    expect(
      Array.from(checked).every((input) => (input as HTMLInputElement).value === 'manage'),
    ).toBe(true);
    expect(container.textContent).toContain('Выдано разделов: 6 из 6');
  });

  it('warns that an admin without sections sees nothing', () => {
    expect(container.textContent).toContain('Ни один раздел не выдан');
  });

  it('reports a login that is already taken and blocks the submit', async () => {
    const username = container.querySelector<HTMLInputElement>('[name="username"]')!;

    await act(async () => changeInput(username, ' Editor '));

    expect(container.textContent).toContain(
      'Администратор с таким логином уже существует.',
    );
    expect(button('Создать администратора').disabled).toBe(true);
  });

  it('waits for the blur before marking a half-typed login as invalid', async () => {
    const username = container.querySelector<HTMLInputElement>('[name="username"]')!;

    await act(async () => changeInput(username, 'gardener.'));
    expect(username.getAttribute('aria-invalid')).toBe('false');

    // React delegates onBlur through focusout, so a plain blur event is ignored.
    await act(async () =>
      username.dispatchEvent(new FocusEvent('focusout', { bubbles: true })),
    );
    expect(username.getAttribute('aria-invalid')).toBe('true');
    expect(button('Создать администратора').disabled).toBe(true);
  });

  it('accepts a cyrillic login', async () => {
    const username = container.querySelector<HTMLInputElement>('[name="username"]')!;

    await act(async () => changeInput(username, 'Редактор'));
    await act(async () =>
      username.dispatchEvent(new FocusEvent('focusout', { bubbles: true })),
    );

    expect(username.value).toBe('редактор');
    expect(username.getAttribute('aria-invalid')).toBe('false');
  });

  it('refuses a login that mixes alphabets', async () => {
    const username = container.querySelector<HTMLInputElement>('[name="username"]')!;

    await act(async () => changeInput(username, 'редактор-editor'));
    await act(async () =>
      username.dispatchEvent(new FocusEvent('focusout', { bubbles: true })),
    );

    expect(username.getAttribute('aria-invalid')).toBe('true');
  });
});
