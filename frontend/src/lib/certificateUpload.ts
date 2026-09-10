export const CERTIFICATE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const CERTIFICATE_PDF_MAX_BYTES = 20 * 1024 * 1024;
export const CERTIFICATE_UPLOAD_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';

const imageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const pdfMimeTypes = new Set(['application/pdf', 'application/x-pdf']);

export const CERTIFICATE_TYPE_ERROR =
  'Загрузите PDF или изображение JPG, PNG либо WEBP.';
export const CERTIFICATE_IMAGE_SIZE_ERROR = 'Размер изображения не должен превышать 5 МБ.';
export const CERTIFICATE_PDF_SIZE_ERROR = 'Размер PDF не должен превышать 20 МБ.';

export function isPdfUpload(file: Pick<File, 'name' | 'type'>) {
  return pdfMimeTypes.has(file.type) || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Mirrors the backend upload guard so an unsupported file is rejected before it
 * is streamed: PDFs may be four times larger than the re-encoded images.
 */
export function validateCertificateFile(file: File | null | undefined) {
  if (!file || file.size === 0) {
    return null;
  }

  if (isPdfUpload(file)) {
    return file.size > CERTIFICATE_PDF_MAX_BYTES ? CERTIFICATE_PDF_SIZE_ERROR : null;
  }

  if (!imageMimeTypes.has(file.type)) {
    return CERTIFICATE_TYPE_ERROR;
  }

  return file.size > CERTIFICATE_IMAGE_MAX_BYTES ? CERTIFICATE_IMAGE_SIZE_ERROR : null;
}
