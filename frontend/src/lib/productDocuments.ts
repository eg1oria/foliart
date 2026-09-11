import type { ProductDocument } from './api';

export const PRODUCT_DOCUMENT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PRODUCT_DOCUMENT_PDF_MAX_BYTES = 20 * 1024 * 1024;
export const PRODUCT_DOCUMENT_UPLOAD_ACCEPT =
  'application/pdf,image/jpeg,image/png,image/webp';
export const PRODUCT_DOCUMENT_TITLE_MAX_LENGTH = 200;

const imageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const pdfMimeTypes = new Set(['application/pdf', 'application/x-pdf']);

export const PRODUCT_DOCUMENT_TYPE_ERROR =
  'Загрузите PDF или изображение JPG, PNG либо WEBP.';
export const PRODUCT_DOCUMENT_IMAGE_SIZE_ERROR =
  'Размер изображения не должен превышать 5 МБ.';
export const PRODUCT_DOCUMENT_PDF_SIZE_ERROR = 'Размер PDF не должен превышать 20 МБ.';

export function isPdfUpload(file: Pick<File, 'name' | 'type'>) {
  return pdfMimeTypes.has(file.type) || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Mirrors the backend upload guard so an unsupported file is rejected before it
 * is streamed: PDFs may be four times larger than the re-encoded images.
 */
export function validateProductDocumentFile(file: File | null | undefined) {
  if (!file || file.size === 0) {
    return null;
  }

  if (isPdfUpload(file)) {
    return file.size > PRODUCT_DOCUMENT_PDF_MAX_BYTES
      ? PRODUCT_DOCUMENT_PDF_SIZE_ERROR
      : null;
  }

  if (!imageMimeTypes.has(file.type)) {
    return PRODUCT_DOCUMENT_TYPE_ERROR;
  }

  return file.size > PRODUCT_DOCUMENT_IMAGE_MAX_BYTES
    ? PRODUCT_DOCUMENT_IMAGE_SIZE_ERROR
    : null;
}

/**
 * The title is what the public link reads, so a document uploaded without one
 * falls back to its file name rather than rendering as an empty link.
 */
export function getProductDocumentLabel(document: ProductDocument) {
  return (
    document.title.trim() ||
    document.originalName.replace(/\.[^.]+$/, '').trim() ||
    document.originalName
  );
}

export function isPdfDocument(document: ProductDocument) {
  return document.mimeType === 'application/pdf';
}

export function formatDocumentSize(byteSize: number) {
  if (!byteSize) {
    return '';
  }

  const megabytes = byteSize / (1024 * 1024);

  return megabytes >= 1
    ? `${megabytes.toFixed(1).replace('.', ',')} МБ`
    : `${Math.max(1, Math.round(byteSize / 1024))} КБ`;
}
