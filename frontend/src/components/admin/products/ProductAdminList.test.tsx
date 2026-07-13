// @vitest-environment jsdom

import { act, type AnchorHTMLAttributes, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Category, Product } from '../../../lib/api';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../../app/[locale]/admin/products/actions', () => ({
  deleteProductAction: vi.fn(),
}));

vi.mock('../../../i18n/routing', () => ({
  Link: ({ children, href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: ReactNode;
    href: string;
    locale?: string;
    scroll?: boolean;
  }) => {
    delete props.locale;
    delete props.scroll;
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

vi.mock('../../catalog/MediaImage', () => ({
  default: ({ alt }: { alt: string }) => <span data-image>{alt}</span>,
}));

import ProductAdminList from './ProductAdminList';

const categories: Category[] = [
  {
    id: 1,
    name: 'Монопродукты',
    nameEn: '',
    description: 'Описание',
    descriptionEn: '',
    imageUrl: '',
    productCount: 1,
  },
  {
    id: 2,
    name: 'Комплексные препараты',
    nameEn: '',
    description: 'Описание',
    descriptionEn: '',
    imageUrl: '',
    productCount: 1,
  },
];

function product(id: number, overrides: Partial<Product> = {}): Product {
  return {
    id,
    categoryId: 1,
    name: `Товар ${id}`,
    nameEn: '',
    description: 'Описание',
    descriptionEn: '',
    advantages: '',
    advantagesEn: '',
    composition: '',
    compositionEn: '',
    application: '',
    applicationEn: '',
    imageUrl: '',
    imageUrlEn: '',
    adminTranslation: {
      locale: 'en',
      hasTranslation: true,
      isComplete: true,
      name: `Product ${id}`,
      description: '',
      advantages: '',
      composition: '',
      application: '',
    },
    ...overrides,
  };
}

describe('ProductAdminList', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    window.history.replaceState({}, '', '/ru/admin/products?contentLocale=en');
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render() {
    act(() => {
      root.render(
        <ProductAdminList
          categories={categories}
          contentLocale="en"
          initialCategoryId={null}
          initialQuery=""
          initialTranslation="all"
          locale="ru"
          products={[
            product(1, { name: 'Copper 88', slugSourceName: 'Медь 88' }),
            product(2, {
              categoryId: 2,
              name: 'Риза',
              adminTranslation: {
                locale: 'en',
                hasTranslation: false,
                isComplete: false,
                name: '',
                description: '',
                advantages: '',
                composition: '',
                application: '',
              },
            }),
          ]}
        />,
      );
    });
  }

  it('filters rows immediately and keeps the query in the URL', () => {
    render();
    const input = container.querySelector<HTMLInputElement>('input[type="search"]')!;

    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )?.set;
      valueSetter?.call(input, 'Риза');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(container.textContent).toContain('Показано 1 из 2');
    expect(window.location.search).toContain('q=%D0%A0%D0%B8%D0%B7%D0%B0');
  });

  it('opens an accessible confirmation dialog and cancels without submitting', () => {
    render();
    const deleteButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Удалить Copper 88"]',
    )!;

    act(() => deleteButton.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain('Удалить «Copper 88»?');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');

    const cancelButton = Array.from(dialog!.querySelectorAll('button')).find(
      (button) => button.textContent === 'Отмена',
    )!;
    act(() => cancelButton.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });
});
