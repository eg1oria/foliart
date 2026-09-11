// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  deleteDocument: vi.fn(),
  moveDocument: vi.fn(),
  renameDocument: vi.fn(),
  uploadDocument: vi.fn(),
}));

vi.mock('@/app/[locale]/admin/products/document-actions', () => ({
  deleteProductDocumentAction: mocks.deleteDocument,
  moveProductDocumentAction: mocks.moveDocument,
  renameProductDocumentAction: mocks.renameDocument,
  uploadProductDocumentAction: mocks.uploadDocument,
}));

import type { ProductDocument } from '@/lib/api';

import ProductDocumentsManager from './ProductDocumentsManager';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

function document_(id: number, title: string, overrides: Partial<ProductDocument> = {}) {
  return {
    id,
    locale: 'ru',
    title,
    fileUrl: `product-documents/${id}-file.pdf`,
    mimeType: 'application/pdf',
    originalName: `${id}-file.pdf`,
    byteSize: 2 * 1024 * 1024,
    ...overrides,
  } satisfies ProductDocument;
}

describe('ProductDocumentsManager', () => {
  let container: HTMLDivElement;
  let root: Root;

  async function render(
    documents: ProductDocument[],
    { contentLocale = 'ru', fallbackCount = 0 } = {},
  ) {
    await act(async () => {
      root.render(
        <ProductDocumentsManager
          contentLocale={contentLocale}
          documents={documents}
          fallbackCount={fallbackCount}
          locale="ru"
          productId={7}
        />,
      );
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.uploadDocument.mockResolvedValue({ status: 'idle' });
    container = window.document.createElement('div');
    window.document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('lists every attached file with its own title and link', async () => {
    await render([document_(1, 'Сертификат соответствия'), document_(2, 'Паспорт безопасности')]);

    const titles = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[name="title"]'),
    ).map((input) => input.value);

    expect(titles).toEqual([
      'Сертификат соответствия',
      'Паспорт безопасности',
      // The last one is the empty title of the upload form.
      '',
    ]);
    expect(container.querySelectorAll('a[href="/media/product-documents/1-file.pdf"]')).toHaveLength(
      1,
    );
    expect(container.textContent).toContain('2,0 МБ');
  });

  // Every write has to name the product and the language it belongs to, or a
  // file would land on the wrong card — or in the wrong language of it.
  it('sends the product and the content locale with every form', async () => {
    await render([document_(1, 'Сертификат соответствия')], { contentLocale: 'fr' });

    for (const form of Array.from(container.querySelectorAll('form'))) {
      expect(form.querySelector<HTMLInputElement>('[name="productId"]')?.value).toBe('7');
      expect(form.querySelector<HTMLInputElement>('[name="contentLocale"]')?.value).toBe('fr');
    }
  });

  it('disables reordering past the ends of the list', async () => {
    await render([document_(1, 'Первый'), document_(2, 'Второй')]);

    const moveButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button[aria-label^="Поднять"], button[aria-label^="Опустить"]'),
    ).map((button) => [button.getAttribute('aria-label'), button.disabled]);

    expect(moveButtons).toEqual([
      ['Поднять выше', true],
      ['Опустить ниже', false],
      ['Поднять выше', false],
      ['Опустить ниже', true],
    ]);
  });

  it('says which files a language is borrowing while it has none of its own', async () => {
    await render([], { contentLocale: 'en', fallbackCount: 2 });

    expect(container.textContent).toContain('2 документ(ов) из русской версии');
  });

  it('falls back to the file name when a document was uploaded untitled', async () => {
    await render([document_(3, '', { originalName: 'Сертификат ГОСТ.pdf' })]);

    expect(container.querySelector<HTMLInputElement>('input[name="title"]')?.value).toBe(
      'Сертификат ГОСТ',
    );
  });
});
