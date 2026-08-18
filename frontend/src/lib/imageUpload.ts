export const IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_UPLOAD_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const imageUploadMimeTypeSet = new Set<string>(IMAGE_UPLOAD_MIME_TYPES);

export const IMAGE_UPLOAD_TYPE_ERROR = 'Поддерживаются только изображения JPG, PNG и WEBP.';
export const IMAGE_UPLOAD_SIZE_ERROR = 'Размер изображения не должен превышать 5 МБ.';

/**
 * Mirrors the backend upload guard (`allowedImageMimeTypes` plus the 5 MB
 * multer limit) so an unsupported file is rejected before it is streamed.
 */
export function validateImageFile(file: File | null | undefined) {
  if (!file || file.size === 0) {
    return null;
  }

  if (!imageUploadMimeTypeSet.has(file.type)) {
    return IMAGE_UPLOAD_TYPE_ERROR;
  }

  if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
    return IMAGE_UPLOAD_SIZE_ERROR;
  }

  return null;
}
