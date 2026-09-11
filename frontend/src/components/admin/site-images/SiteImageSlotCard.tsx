'use client';

import Image from 'next/image';
import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { FiExternalLink, FiUpload } from 'react-icons/fi';

import AdminDeleteButton from '@/components/admin/AdminDeleteButton';
import {
  adminCx,
  adminDangerButtonClassName,
  adminHintClassName,
  adminPrimaryButtonClassName,
} from '@/components/admin/adminStyles';
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

function formatUpdatedAt(value: string) {
  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? ''
    : new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long' }).format(parsed);
}

export default function SiteImageSlotCard({
  canManage,
  images,
  locale,
  slotKey,
}: {
  canManage: boolean;
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

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const visibleError = clientError ?? (state.key === slotKey ? state.fieldErrors?.file : undefined);
  const errorMessage = state.status === 'error' && state.key === slotKey ? state.message : null;

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const selectFile = (nextFile: File | null) => {
    const nextError = validateSiteImageFile(nextFile);

    setClientError(nextError);
    setAspectWarning(null);
    setFile(nextError ? null : nextFile);
  };

  // Dropping writes the file back into the input so the form submits it the
  // same way a click-to-browse selection would.
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDropTarget(false);

    const dropped = event.dataTransfer.files?.[0];
    if (!dropped || !inputRef.current) return;

    const transfer = new DataTransfer();
    transfer.items.add(dropped);
    inputRef.current.files = transfer.files;
    selectFile(dropped);
  };

  return (
    <div className="flex min-w-0 flex-col rounded-lg border border-[#0b5a45]/10 bg-white p-4">
      <div
        onDragOver={(event) => {
          if (!canManage) return;
          event.preventDefault();
          setIsDropTarget(true);
        }}
        onDragLeave={() => setIsDropTarget(false)}
        onDrop={canManage ? handleDrop : undefined}
        style={{ aspectRatio: slot.aspect }}
        className={adminCx(
          'relative w-full overflow-hidden rounded-md border bg-[#f7f9f6] transition',
          isDropTarget ? 'border-[#0b5a45] ring-2 ring-[#0b5a45]/20' : 'border-[#0b5a45]/10',
        )}>
        <Image
          key={previewUrl ?? current.src}
          src={previewUrl ?? current.src}
          alt=""
          fill
          unoptimized={Boolean(previewUrl)}
          sizes="(max-width: 640px) 100vw, 320px"
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
        {canManage ? (
          <span className="absolute inset-x-0 bottom-0 bg-black/45 px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
            {file ? 'Не сохранено' : 'Перетащите фото сюда'}
          </span>
        ) : null}
      </div>

      <h3 className="mt-3 text-base font-semibold leading-tight text-[#0b3e31]">{slot.label}</h3>
      <p className={adminCx('mt-1', adminHintClassName)}>{slot.hint}</p>
      <p className={adminCx('mt-1', adminHintClassName)}>Рекомендуемый размер: {slot.recommended}</p>
      <p className="mt-1 text-xs font-medium leading-5 text-[#0b5a45]">
        {stored
          ? `Загружено ${formatUpdatedAt(stored.updatedAt)}, ${stored.width}×${stored.height}`
          : 'Встроенное в сайт'}
      </p>

      <Link
        href={siteImageGroupPaths[slot.group]}
        target="_blank"
        className="mt-2 inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-[#0b5a45] underline underline-offset-4">
        <FiExternalLink aria-hidden="true" />
        Посмотреть на сайте
      </Link>

      {/* `mt-auto` pins the controls to the bottom of the card: the cards in a
          row are stretched to the same height, and labels and hints of
          different lengths would otherwise leave every button at its own
          level. */}
      {canManage ? (
        <div className="mt-auto border-t border-[#0b5a45]/10 pt-4">
          <form action={formAction}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="key" value={slotKey} />
            <input
              ref={inputRef}
              type="file"
              name="file"
              accept={SITE_IMAGE_UPLOAD_ACCEPT}
              aria-invalid={Boolean(visibleError)}
              aria-label={`Файл для слота «${slot.label}»`}
              className="block w-full max-w-full overflow-hidden text-xs text-[#0b3e31] file:mr-3 file:rounded-md file:border-0 file:bg-[#0b5a45] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
              onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
            />

            {visibleError ? (
              <p data-field-error className="mt-2 text-xs font-medium leading-5 text-red-700">
                {visibleError}
              </p>
            ) : null}
            {errorMessage ? (
              <p role="alert" className="mt-2 text-xs font-medium leading-5 text-red-700">
                {errorMessage}
              </p>
            ) : null}
            {aspectWarning ? (
              <p className="mt-2 text-xs font-medium leading-5 text-amber-700">{aspectWarning}</p>
            ) : null}

            <button
              type="submit"
              disabled={pending || !file}
              className={adminCx(
                adminPrimaryButtonClassName,
                'mt-3 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-60',
              )}>
              <FiUpload aria-hidden="true" />
              {pending ? 'Загрузка…' : 'Загрузить'}
            </button>
          </form>

          {stored ? (
            <SlotResetButton label={slot.label} locale={locale} slotKey={slotKey} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// A sibling form rather than a nested one — nesting is invalid HTML, and reset
// submits to a different action than the upload above it.
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
    <div className="mt-3">
      <form action={resetSiteImageAction}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="key" value={slotKey} />
        <AdminDeleteButton
          className={adminCx(adminDangerButtonClassName, 'w-full gap-2')}
          confirmMessage={`Вернуть исходное изображение для слота «${label}»?`}
          pendingLabel="Возврат…">
          Вернуть исходное
        </AdminDeleteButton>
      </form>
    </div>
  );
}
