'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  FiArrowDown,
  FiArrowUp,
  FiCheck,
  FiExternalLink,
  FiFileText,
  FiImage,
  FiUpload,
} from 'react-icons/fi';

import AdminDeleteButton from '@/components/admin/AdminDeleteButton';
import type { ProductDocument } from '@/lib/api';
import { getContentLocaleLabel } from '@/lib/contentLocales';
import { resolveMediaUrl } from '@/lib/media';
import {
  formatDocumentSize,
  getProductDocumentLabel,
  isPdfDocument,
  PRODUCT_DOCUMENT_TITLE_MAX_LENGTH,
  PRODUCT_DOCUMENT_UPLOAD_ACCEPT,
  validateProductDocumentFile,
} from '@/lib/productDocuments';

import {
  adminCx,
  adminDangerButtonClassName,
  adminFieldClassName,
  adminFileInputClassName,
  adminHintClassName,
  adminInputClassName,
  adminLabelClassName,
  adminPrimaryButtonClassName,
  adminSecondaryButtonClassName,
} from '../adminStyles';
import {
  deleteProductDocumentAction,
  moveProductDocumentAction,
  renameProductDocumentAction,
  uploadProductDocumentAction,
  type ProductDocumentActionState,
} from '../../../app/[locale]/admin/products/document-actions';

const initialState: ProductDocumentActionState = { status: 'idle' };

type ProductDocumentsManagerProps = {
  contentLocale: string;
  documents: ProductDocument[];
  fallbackCount: number;
  locale: string;
  productId: number;
};

function HiddenContext({
  contentLocale,
  locale,
  productId,
}: {
  contentLocale: string;
  locale: string;
  productId: number;
}) {
  return (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="contentLocale" value={contentLocale} />
      <input type="hidden" name="productId" value={productId} />
    </>
  );
}

function IconSubmitButton({
  children,
  disabled,
  label,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  label: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-label={label}
      title={label}
      className={adminCx(
        adminSecondaryButtonClassName,
        'min-h-9 px-2.5 disabled:cursor-not-allowed disabled:opacity-40',
      )}>
      {children}
    </button>
  );
}

function RenameSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={adminCx(adminSecondaryButtonClassName, 'min-h-9 gap-1.5 px-3')}>
      <FiCheck aria-hidden="true" />
      {pending ? 'Сохранение…' : 'Сохранить'}
    </button>
  );
}

function DocumentRow({
  contentLocale,
  document,
  isFirst,
  isLast,
  locale,
  productId,
}: {
  contentLocale: string;
  document: ProductDocument;
  isFirst: boolean;
  isLast: boolean;
  locale: string;
  productId: number;
}) {
  const href = resolveMediaUrl(document.fileUrl);
  const isPdf = isPdfDocument(document);
  const size = formatDocumentSize(document.byteSize);

  return (
    <li className="rounded-lg border border-[#0b5a45]/10 bg-[#f7f9f6] p-3 sm:p-4">
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#0b5a45]/10 bg-white text-lg text-[#0b5a45]">
          {isPdf ? <FiFileText aria-hidden="true" /> : <FiImage aria-hidden="true" />}
        </span>

        <div className="min-w-0 flex-1">
          <form action={renameProductDocumentAction} className="flex flex-wrap items-end gap-2">
            <HiddenContext contentLocale={contentLocale} locale={locale} productId={productId} />
            <input type="hidden" name="documentId" value={document.id} />
            <label className="min-w-0 flex-1">
              <span className="sr-only">Название документа</span>
              <input
                type="text"
                name="title"
                required
                maxLength={PRODUCT_DOCUMENT_TITLE_MAX_LENGTH}
                defaultValue={getProductDocumentLabel(document)}
                className={adminCx(adminInputClassName, 'min-h-10 bg-white')}
              />
            </label>
            <RenameSubmitButton />
          </form>

          <p className={adminCx('mt-2 break-all', adminHintClassName)}>
            {document.originalName}
            {size ? ` · ${size}` : ''} · {isPdf ? 'PDF' : 'Изображение'}
          </p>

          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#0b5a45] underline underline-offset-4">
              <FiExternalLink aria-hidden="true" />
              Открыть файл
            </a>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <form action={moveProductDocumentAction}>
            <HiddenContext contentLocale={contentLocale} locale={locale} productId={productId} />
            <input type="hidden" name="documentId" value={document.id} />
            <input type="hidden" name="direction" value="up" />
            <IconSubmitButton disabled={isFirst} label="Поднять выше">
              <FiArrowUp aria-hidden="true" />
            </IconSubmitButton>
          </form>

          <form action={moveProductDocumentAction}>
            <HiddenContext contentLocale={contentLocale} locale={locale} productId={productId} />
            <input type="hidden" name="documentId" value={document.id} />
            <input type="hidden" name="direction" value="down" />
            <IconSubmitButton disabled={isLast} label="Опустить ниже">
              <FiArrowDown aria-hidden="true" />
            </IconSubmitButton>
          </form>

          <form action={deleteProductDocumentAction}>
            <HiddenContext contentLocale={contentLocale} locale={locale} productId={productId} />
            <input type="hidden" name="documentId" value={document.id} />
            <AdminDeleteButton
              className={adminCx(adminDangerButtonClassName, 'min-h-9 px-2.5')}
              confirmMessage={`Удалить документ «${getProductDocumentLabel(document)}»?`}
              iconOnly
              pendingLabel="Удаление…">
              Удалить документ
            </AdminDeleteButton>
          </form>
        </div>
      </div>
    </li>
  );
}

/**
 * Files are attached per language, so this manager only ever shows — and only
 * ever writes — the documents of the content locale the editor is open in.
 */
export default function ProductDocumentsManager({
  contentLocale,
  documents,
  fallbackCount,
  locale,
  productId,
}: ProductDocumentsManagerProps) {
  const [state, formAction, pending] = useActionState(uploadProductDocumentAction, initialState);
  const [clientError, setClientError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const localeLabel = getContentLocaleLabel(contentLocale);
  const visibleError = clientError ?? state.fieldErrors?.file;

  useEffect(() => {
    if (state.status === 'error') {
      errorRef.current?.focus();
    }
  }, [state]);

  return (
    <div className="space-y-5">
      {state.status === 'error' ? (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 outline-none focus:ring-2 focus:ring-red-300">
          {state.message ?? 'Не удалось загрузить документ.'}
        </div>
      ) : null}

      {documents.length > 0 ? (
        <ul className="space-y-3">
          {documents.map((document, index) => (
            <DocumentRow
              key={document.id}
              contentLocale={contentLocale}
              document={document}
              isFirst={index === 0}
              isLast={index === documents.length - 1}
              locale={locale}
              productId={productId}
            />
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-[#0b5a45]/20 bg-[#f7f9f6] px-4 py-5 text-sm leading-6 text-[#567068]">
          {fallbackCount > 0
            ? `Для версии ${localeLabel} документы не загружены — в каталоге показываются ${fallbackCount} документ(ов) из русской версии. Загрузите файлы здесь, чтобы заменить их.`
            : `Документы ещё не загружены. Добавьте сертификаты и другие файлы, которые должны открываться из карточки товара (${localeLabel}).`}
        </p>
      )}

      <form action={formAction} className="space-y-4 border-t border-[#0b5a45]/10 pt-5">
        <HiddenContext contentLocale={contentLocale} locale={locale} productId={productId} />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={adminFieldClassName}>
            <span className={adminLabelClassName}>Название документа</span>
            <input
              type="text"
              name="title"
              maxLength={PRODUCT_DOCUMENT_TITLE_MAX_LENGTH}
              placeholder="Например, Сертификат соответствия"
              aria-invalid={Boolean(state.fieldErrors?.title)}
              className={adminInputClassName}
            />
            <span className={adminHintClassName}>
              Это текст ссылки в карточке товара. Если оставить пустым, подставится имя файла.
            </span>
            {state.fieldErrors?.title ? (
              <span data-field-error className="text-xs font-medium leading-5 text-red-700">
                {state.fieldErrors.title}
              </span>
            ) : null}
          </label>

          <label className={adminFieldClassName}>
            <span className={adminLabelClassName}>Файл</span>
            <input
              type="file"
              name="file"
              accept={PRODUCT_DOCUMENT_UPLOAD_ACCEPT}
              aria-invalid={Boolean(visibleError)}
              aria-describedby={visibleError ? 'product-document-file-error' : undefined}
              className={adminFileInputClassName}
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                const nextError = validateProductDocumentFile(nextFile);

                event.target.setCustomValidity(nextError ?? '');
                setClientError(nextError);
              }}
            />
            <span className={adminHintClassName}>
              PDF до 20 МБ либо изображение JPG, PNG или WEBP до 5 МБ.
            </span>
            {visibleError ? (
              <span
                id="product-document-file-error"
                data-field-error
                className="text-xs font-medium leading-5 text-red-700">
                {visibleError}
              </span>
            ) : null}
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className={adminCx(adminPrimaryButtonClassName, 'min-w-52 gap-2')}>
            <FiUpload aria-hidden="true" />
            {pending ? 'Загрузка…' : 'Добавить документ'}
          </button>
        </div>
      </form>
    </div>
  );
}
