'use client';

import Image from 'next/image';
import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { FiCheck, FiExternalLink, FiRotateCcw, FiUploadCloud, FiX } from 'react-icons/fi';

import { adminCx, adminPrimaryButtonClassName } from '@/components/admin/adminStyles';
import { Link } from '@/i18n/routing';
import { resolveSiteImage } from '@/lib/media';
import {
  siteImageGroupPaths,
  siteImageSlots,
  type SiteImageKey,
  type SiteImageMap,
} from '@/lib/siteImages';
import {
  getAspectMismatchWarning,
  SITE_IMAGE_UPLOAD_ACCEPT,
  validateSiteImageFile,
} from '@/lib/siteImageUpload';

import {
  resetSiteImageAction,
  uploadSiteImageAction,
  type SiteImageActionState,
} from '../../../app/[locale]/admin/site-images/actions';

const initialState: SiteImageActionState = { status: 'idle' };

const iconButtonClassName =
  'inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-[#7e9088] transition hover:bg-[#eef4ef] hover:text-[#0b5a45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b5a45]/20 disabled:cursor-not-allowed disabled:opacity-50';

function formatUpdatedAt(value: string) {
  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? ''
    : new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(
        parsed,
      );
}

export default function SiteImageSlotCard({
  canManage,
  highlighted = false,
  images,
  locale,
  slotKey,
}: {
  canManage: boolean;
  highlighted?: boolean;
  images: SiteImageMap;
  locale: string;
  slotKey: SiteImageKey;
}) {
  const slot = siteImageSlots[slotKey];
  const stored = images[slotKey];
  const current = resolveSiteImage(images, slotKey);

  const [state, formAction, pending] = useActionState(uploadSiteImageAction, initialState);
  const [file, setFile] = useState<File | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [aspectWarning, setAspectWarning] = useState<string | null>(null);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const visibleError = clientError ?? (state.key === slotKey ? state.fieldErrors?.file : undefined);
  const errorMessage = state.status === 'error' && state.key === slotKey ? state.message : null;

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  // After an upload or reset the page reloads on the same tab; bring the card
  // that just changed into view so the admin sees the result.
  useEffect(() => {
    if (highlighted) cardRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [highlighted]);

  const selectFile = (nextFile: File | null) => {
    const nextError = validateSiteImageFile(nextFile);

    setClientError(nextError);
    setAspectWarning(null);
    setFile(nextError ? null : nextFile);
  };

  const clearFile = () => {
    if (inputRef.current) inputRef.current.value = '';
    setFile(null);
    setClientError(null);
    setAspectWarning(null);
  };

  // Dropping writes the file back into the input so the form submits it the
  // same way a click-to-browse selection would.
  const handleDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDropTarget(false);

    const dropped = event.dataTransfer.files?.[0];
    if (!dropped || !inputRef.current) return;

    const transfer = new DataTransfer();
    transfer.items.add(dropped);
    inputRef.current.files = transfer.files;
    selectFile(dropped);
  };

  const preview = (
    <>
      <Image
        key={previewUrl ?? current.src}
        src={previewUrl ?? current.src}
        alt=""
        fill
        unoptimized={Boolean(previewUrl)}
        sizes="(max-width: 640px) 100vw, 360px"
        className="object-cover"
        onLoad={(event) => {
          if (!file) return;
          setAspectWarning(
            getAspectMismatchWarning(
              slot.aspect,
              event.currentTarget.naturalWidth,
              event.currentTarget.naturalHeight,
              slot.recommended,
            ),
          );
        }}
      />
      {file ? (
        <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-semibold text-amber-950">
          Не сохранено
        </span>
      ) : stored ? (
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-[#0b5a45] backdrop-blur">
          <FiCheck aria-hidden="true" />
          Заменено
        </span>
      ) : null}
    </>
  );

  return (
    <div
      ref={cardRef}
      className={adminCx(
        'group/card flex min-w-0 flex-col rounded-xl transition',
        highlighted && 'ring-2 ring-[#0b5a45]/25 ring-offset-4',
      )}>
      {canManage ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDropTarget(true);
          }}
          onDragLeave={() => setIsDropTarget(false)}
          onDrop={handleDrop}
          style={{ aspectRatio: slot.aspect }}
          aria-label={`Выбрать новое фото для слота «${slot.label}»`}
          className={adminCx(
            'group/drop relative w-full cursor-pointer overflow-hidden rounded-xl bg-[#f1f4f0] outline-none transition focus-visible:ring-2 focus-visible:ring-[#0b5a45]/40',
            isDropTarget ? 'ring-2 ring-[#0b5a45]' : 'ring-1 ring-[#0b5a45]/10',
          )}>
          {preview}
          <span
            className={adminCx(
              'absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[#0b3e31]/55 text-sm font-medium text-white transition',
              isDropTarget
                ? 'opacity-100'
                : 'opacity-0 group-hover/drop:opacity-100 group-focus-visible/drop:opacity-100',
            )}>
            <FiUploadCloud className="size-6" aria-hidden="true" />
            {isDropTarget ? 'Отпустите файл' : 'Заменить фото'}
          </span>
        </button>
      ) : (
        <div
          style={{ aspectRatio: slot.aspect }}
          className="relative w-full overflow-hidden rounded-xl bg-[#f1f4f0] ring-1 ring-[#0b5a45]/10">
          {preview}
        </div>
      )}

      <div className="mt-3 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold leading-snug text-[#0b3e31]">{slot.label}</h3>
          <p className="mt-0.5 text-xs leading-5 text-[#6a7f76]">{slot.hint}</p>
        </div>

        <div className="-mr-1 flex shrink-0 items-center">
          <Link
            href={siteImageGroupPaths[slot.group]}
            target="_blank"
            title="Посмотреть на сайте"
            aria-label="Посмотреть на сайте"
            className={iconButtonClassName}>
            <FiExternalLink aria-hidden="true" />
          </Link>
          {canManage && stored ? (
            <SlotResetButton label={slot.label} locale={locale} slotKey={slotKey} />
          ) : null}
        </div>
      </div>

      <p className="mt-2 text-xs leading-5 text-[#9aaaa3]">
        {slot.recommended} px
        <span className="mx-1.5">·</span>
        {stored
          ? `${stored.width}×${stored.height}, ${formatUpdatedAt(stored.updatedAt)}`
          : 'исходное изображение'}
      </p>

      {canManage ? (
        <form action={formAction} className={file || visibleError || errorMessage ? 'mt-3' : ''}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="key" value={slotKey} />
          <input
            ref={inputRef}
            type="file"
            name="file"
            accept={SITE_IMAGE_UPLOAD_ACCEPT}
            aria-invalid={Boolean(visibleError)}
            aria-label={`Файл для слота «${slot.label}»`}
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
          />

          {visibleError ? (
            <p data-field-error className="text-xs font-medium leading-5 text-red-700">
              {visibleError}
            </p>
          ) : null}
          {errorMessage ? (
            <p role="alert" className="text-xs font-medium leading-5 text-red-700">
              {errorMessage}
            </p>
          ) : null}
          {aspectWarning ? (
            <p className="text-xs font-medium leading-5 text-amber-700">{aspectWarning}</p>
          ) : null}

          {file ? (
            <div className="mt-2 flex gap-2">
              <button
                type="submit"
                disabled={pending}
                className={adminCx(
                  adminPrimaryButtonClassName,
                  'min-h-9 flex-1 gap-2 py-1.5 disabled:cursor-not-allowed disabled:opacity-60',
                )}>
                {pending ? 'Сохранение…' : 'Сохранить'}
              </button>
              <button
                type="button"
                onClick={clearFile}
                disabled={pending}
                title="Отменить"
                aria-label="Отменить выбор файла"
                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-[#0b5a45]/14 text-[#567068] transition hover:bg-[#eef4ef] disabled:cursor-not-allowed disabled:opacity-60">
                <FiX aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}

// A sibling form rather than a nested one — nesting is invalid HTML, and reset
// submits to a different action than the upload.
function SlotResetButton({
  label,
  locale,
  slotKey,
}: {
  label: string;
  locale: string;
  slotKey: SiteImageKey;
}) {
  return (
    <form action={resetSiteImageAction} title="Вернуть исходное">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="key" value={slotKey} />
      <ResetSubmitButton label={label} />
    </form>
  );
}

function ResetSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={pending ? 'Возврат…' : 'Вернуть исходное'}
      className={adminCx(iconButtonClassName, 'hover:bg-red-50 hover:text-red-700')}
      onClick={(event) => {
        if (!window.confirm(`Вернуть исходное изображение для слота «${label}»?`)) {
          event.preventDefault();
        }
      }}>
      <FiRotateCcw className={pending ? 'animate-spin' : undefined} aria-hidden="true" />
    </button>
  );
}
