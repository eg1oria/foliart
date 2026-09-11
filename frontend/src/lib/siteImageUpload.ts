export const SITE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const SITE_IMAGE_UPLOAD_ACCEPT = 'image/jpeg,image/png,image/webp';

const imageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const SITE_IMAGE_TYPE_ERROR = 'Загрузите изображение JPG, PNG или WEBP.';
export const SITE_IMAGE_SIZE_ERROR = 'Размер изображения не должен превышать 5 МБ.';

/**
 * Mirrors the backend upload guard so an unsupported file never leaves the
 * browser: a 20 MB photo rejected server-side costs the whole upload first.
 */
export function validateSiteImageFile(file: File | null | undefined) {
  if (!file || file.size === 0) {
    return null;
  }

  if (!imageMimeTypes.has(file.type)) {
    return SITE_IMAGE_TYPE_ERROR;
  }

  return file.size > SITE_IMAGE_MAX_BYTES ? SITE_IMAGE_SIZE_ERROR : null;
}

/** `aspect` from the registry is written as `w/h`. */
export function parseAspectRatio(aspect: string) {
  const [width, height] = aspect.split('/').map((part) => Number.parseFloat(part.trim()));

  return Number.isFinite(width) && Number.isFinite(height) && height > 0 ? width / height : null;
}

const aspectMismatchTolerance = 0.15;

/**
 * A warning, never a block: an off-ratio photo still renders, it just gets
 * cropped, and the admin is the one who knows whether that is acceptable.
 */
export function getAspectMismatchWarning(
  aspect: string,
  width: number,
  height: number,
  recommended: string,
) {
  const expected = parseAspectRatio(aspect);

  if (!expected || !width || !height) {
    return null;
  }

  const actual = width / height;

  if (Math.abs(actual - expected) / expected <= aspectMismatchTolerance) {
    return null;
  }

  return `Пропорции ${width}×${height} заметно отличаются от рекомендуемых (${recommended}) — фото обрежется по краям.`;
}
