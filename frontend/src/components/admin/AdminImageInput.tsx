'use client';

import { useEffect, useMemo, useState } from 'react';
import { FiImage } from 'react-icons/fi';

import MediaImage from '@/components/catalog/MediaImage';
import { IMAGE_UPLOAD_MIME_TYPES, validateImageFile } from '@/lib/imageUpload';

import {
  adminCx,
  adminFieldClassName,
  adminFileInputClassName,
  adminHintClassName,
  adminLabelClassName,
} from './adminStyles';

/**
 * File picker with a live preview of the pending upload, shared by the product
 * and category editors so both reject the same files before submitting.
 */
export default function AdminImageInput({
  error,
  initialSrc,
  label,
  name,
  required,
}: {
  error?: string;
  initialSrc?: string | null;
  label: string;
  name: string;
  required?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const errorId = `${name}-error`;
  const visibleError = clientError ?? error;

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  return (
    <label className={adminFieldClassName}>
      <span className={adminLabelClassName}>{label}</span>
      <div className="grid gap-3 rounded-lg border border-[#0b5a45]/10 bg-[#f7f9f6] p-3 sm:grid-cols-[112px_minmax(0,1fr)] sm:items-center">
        <div className="relative aspect-square w-full overflow-hidden rounded-md border border-[#0b5a45]/10 bg-white sm:w-28">
          <MediaImage
            src={previewUrl ?? initialSrc}
            alt=""
            fill
            unoptimized={Boolean(previewUrl)}
            sizes="112px"
            className="object-contain p-2"
            emptyState={
              <div className="flex h-full items-center justify-center text-[#8a9a93]">
                <FiImage aria-hidden="true" className="text-2xl" />
              </div>
            }
          />
        </div>
        <div className="min-w-0">
          <input
            type="file"
            name={name}
            required={required}
            accept={IMAGE_UPLOAD_MIME_TYPES.join(',')}
            aria-invalid={Boolean(visibleError)}
            aria-describedby={visibleError ? errorId : undefined}
            className={adminFileInputClassName}
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;
              const nextError = validateImageFile(nextFile);

              event.target.setCustomValidity(nextError ?? '');
              setClientError(nextError);
              setFile(nextFile);
            }}
          />
          <p className={adminCx('mt-2', adminHintClassName)}>
            JPG, PNG или WEBP, не более 5 МБ. Новое изображение заменит текущее после сохранения.
          </p>
          {visibleError ? (
            <span id={errorId} data-field-error className="text-xs font-medium leading-5 text-red-700">
              {visibleError}
            </span>
          ) : null}
        </div>
      </div>
    </label>
  );
}
