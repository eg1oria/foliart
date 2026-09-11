import { closeSync, existsSync, openSync, readSync, unlinkSync } from 'node:fs';
import { extname } from 'node:path';

/**
 * Product document uploads accept a PDF scan or a photo of the same paper, and
 * have to agree with the limits the admin form advertises.
 */
export const maxDocumentPdfUploadBytes = 20 * 1024 * 1024;

export const allowedPdfMimeTypes = new Set([
  'application/pdf',
  'application/x-pdf',
]);

type UploadedFileLike = {
  mimetype: string;
  originalname: string;
  path: string;
};

export function isPdfUpload(
  file: Pick<UploadedFileLike, 'mimetype' | 'originalname'>,
) {
  return (
    allowedPdfMimeTypes.has(file.mimetype) ||
    extname(file.originalname).toLowerCase() === '.pdf'
  );
}

/**
 * A `.pdf` name and a PDF content type are both caller-supplied, so the stored
 * bytes are what decides: anything that is not a real PDF is rejected before a
 * row points at it.
 */
export function hasPdfFileSignature(file: Pick<UploadedFileLike, 'path'>) {
  let descriptor: number | null = null;

  try {
    const signature = Buffer.alloc(5);
    descriptor = openSync(file.path, 'r');
    const bytesRead = readSync(descriptor, signature, 0, signature.length, 0);

    return bytesRead === signature.length && signature.toString() === '%PDF-';
  } catch {
    return false;
  } finally {
    if (descriptor !== null) {
      closeSync(descriptor);
    }
  }
}

/**
 * Multer hands filenames over decoded as latin1, so a Cyrillic (or any
 * non-ASCII) name arrives mojibake — and it is what an untitled document falls
 * back to on the public page. Re-reading those bytes as UTF-8 restores the
 * original name; a value that does not decode cleanly is kept as it came.
 */
export function decodeUploadedFileName(value: string) {
  if (!/[\u0080-\u00ff]/.test(value)) {
    return value;
  }

  const decoded = Buffer.from(value, 'latin1').toString('utf8');

  return decoded.includes('\ufffd') ? value : decoded;
}

export function removeUploadedFile(
  filePath: string | undefined,
  label: string,
) {
  if (!filePath || !existsSync(filePath)) {
    return;
  }

  try {
    unlinkSync(filePath);
  } catch (error) {
    console.warn(`Uploaded ${label} could not be removed`, {
      message: error instanceof Error ? error.message : String(error),
      path: filePath,
    });
  }
}
