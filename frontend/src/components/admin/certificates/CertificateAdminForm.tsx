'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { FiExternalLink, FiFileText, FiUpload } from 'react-icons/fi';

import MediaImage from '@/components/catalog/MediaImage';
import type { Certificate } from '@/lib/api';
import {
  CERTIFICATE_UPLOAD_ACCEPT,
  isPdfUpload,
  validateCertificateFile,
} from '@/lib/certificateUpload';
import { resolveMediaUrl } from '@/lib/media';

import {
  adminCx,
  adminFieldClassName,
  adminFileInputClassName,
  adminHintClassName,
  adminLabelClassName,
  adminPrimaryButtonClassName,
} from '../adminStyles';
import {
  uploadCertificateAction,
  type CertificateActionState,
} from '../../../app/[locale]/admin/certificates/actions';

const initialState: CertificateActionState = { status: 'idle' };

function CertificatePreview({
  isPdf,
  isPending,
  src,
}: {
  isPdf: boolean;
  isPending: boolean;
  src: string | null;
}) {
  if (src && !isPdf) {
    return (
      <MediaImage
        src={src}
        alt=""
        fill
        unoptimized={isPending}
        sizes="220px"
        className="object-contain p-2"
        emptyState={<PreviewPlaceholder />}
      />
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-[#0b5a45]">
      {src ? (
        <>
          <FiFileText aria-hidden="true" className="text-3xl" />
          <span className="text-xs font-semibold uppercase tracking-[0.14em]">PDF</span>
        </>
      ) : (
        <PreviewPlaceholder />
      )}
    </div>
  );
}

function PreviewPlaceholder() {
  return (
    <div className="flex h-full items-center justify-center text-[#8a9a93]">
      <FiFileText aria-hidden="true" className="text-2xl" />
    </div>
  );
}

export default function CertificateAdminForm({
  certificate,
  locale,
}: {
  certificate: Certificate;
  locale: string;
}) {
  const [state, formAction, pending] = useActionState(uploadCertificateAction, initialState);
  const [file, setFile] = useState<File | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const storedHref = resolveMediaUrl(certificate.fileUrl);
  const storedIsPdf = certificate.mimeType === 'application/pdf';
  const visibleError = clientError ?? state.fieldErrors?.file;

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  useEffect(() => {
    if (state.status === 'error') {
      errorRef.current?.focus();
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />

      {state.status === 'error' ? (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 outline-none focus:ring-2 focus:ring-red-300">
          {state.message ?? 'Не удалось загрузить сертификат.'}
        </div>
      ) : null}

      <label className={adminFieldClassName}>
        <span className={adminLabelClassName}>Файл сертификата</span>
        <div className="grid gap-4 rounded-lg border border-[#0b5a45]/10 bg-[#f7f9f6] p-4 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-start">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md border border-[#0b5a45]/10 bg-white">
            <CertificatePreview
              isPdf={file ? isPdfUpload(file) : storedIsPdf}
              isPending={Boolean(previewUrl)}
              src={previewUrl ?? storedHref}
            />
          </div>

          <div className="min-w-0">
            <input
              type="file"
              name="file"
              accept={CERTIFICATE_UPLOAD_ACCEPT}
              aria-invalid={Boolean(visibleError)}
              aria-describedby={visibleError ? 'certificate-file-error' : undefined}
              className={adminFileInputClassName}
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                const nextError = validateCertificateFile(nextFile);

                event.target.setCustomValidity(nextError ?? '');
                setClientError(nextError);
                setFile(nextFile);
              }}
            />
            <p className={adminCx('mt-2', adminHintClassName)}>
              PDF до 20 МБ либо изображение JPG, PNG или WEBP до 5 МБ. Новый файл заменит
              текущий сразу после загрузки.
            </p>

            {visibleError ? (
              <span
                id="certificate-file-error"
                data-field-error
                className="text-xs font-medium leading-5 text-red-700">
                {visibleError}
              </span>
            ) : null}

            {storedHref ? (
              <a
                href={storedHref}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0b5a45] underline underline-offset-2">
                <FiExternalLink aria-hidden="true" />
                Открыть текущий сертификат
              </a>
            ) : (
              <p className="mt-4 text-sm text-[#6a7f76]">
                Сертификат ещё не загружен — на страницах товаров показывается файл,
                встроенный в сайт.
              </p>
            )}
          </div>
        </div>
      </label>

      <div className="flex justify-end border-t border-[#0b5a45]/10 pt-5">
        <button
          type="submit"
          disabled={pending}
          className={adminCx(adminPrimaryButtonClassName, 'min-w-52 gap-2')}>
          <FiUpload aria-hidden="true" />
          {pending ? 'Загрузка…' : 'Загрузить сертификат'}
        </button>
      </div>
    </form>
  );
}
