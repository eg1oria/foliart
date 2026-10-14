'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import type { IconType } from 'react-icons';
import { FiCheck, FiCode, FiCopy, FiCornerDownLeft, FiUpload } from 'react-icons/fi';

import {
  deleteSitePageImageAction,
  type SitePageActionState,
  uploadSitePageImageAction,
} from '../../../app/[locale]/admin/site-pages/actions';
import AdminDeleteButton from '@/components/admin/AdminDeleteButton';
import { resolveMediaUrl } from '@/lib/media';
import type { SitePageImage } from '@/lib/sitePages';

import {
  adminCx,
  adminDangerButtonClassName,
  adminFileInputClassName,
  adminHintClassName,
  adminPrimaryButtonClassName,
  adminSecondaryButtonClassName,
} from '../adminStyles';

const initialState: SitePageActionState = { status: 'idle' };

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} МБ`
    : `${Math.max(1, Math.round(bytes / 1024))} КБ`;
}

export function getSitePageImageSnippet(image: SitePageImage) {
  const src = resolveMediaUrl(image.imageUrl) ?? '';
  const size = image.width && image.height ? ` width="${image.width}" height="${image.height}"` : '';
  return `<img src="${src}" alt=""${size} loading="lazy" style="max-width:100%;height:auto">`;
}

function CopyButton({ icon: Icon, label, value }: { icon: IconType; label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          window.prompt('Скопируйте вручную:', value);
        }
      }}
      className={adminCx(adminSecondaryButtonClassName, 'h-8 min-h-8 gap-1.5 px-2.5 text-xs')}>
      {copied ? <FiCheck aria-hidden="true" /> : <Icon aria-hidden="true" />}
      {copied ? 'Скопировано' : label}
    </button>
  );
}

/**
 * Images for the page's HTML. They are shared by every language of the page,
 * served from this site, and removed together with the page.
 */
export default function SitePageImagesPanel({
  canManage,
  images,
  locale,
  onInsert,
  pageId,
}: {
  canManage: boolean;
  images: SitePageImage[];
  locale: string;
  onInsert?: (snippet: string) => void;
  pageId: number;
}) {
  const [uploadState, uploadAction, uploading] = useActionState(
    uploadSitePageImageAction,
    initialState,
  );
  const [deleteState, deleteAction] = useActionState(deleteSitePageImageAction, initialState);
  const fileRef = useRef<HTMLInputElement>(null);
  const notice = [uploadState, deleteState]
    .filter((state) => state.status !== 'idle')
    .sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0))[0];

  useEffect(() => {
    if (uploadState.status === 'success' && fileRef.current) {
      fileRef.current.value = '';
    }
  }, [uploadState]);

  return (
    <div className="space-y-4">
      {canManage ? (
        <form action={uploadAction} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="pageId" value={pageId} />
          <input
            ref={fileRef}
            type="file"
            name="file"
            accept="image/jpeg,image/png,image/webp"
            required
            className={adminFileInputClassName}
          />
          <button
            type="submit"
            disabled={uploading}
            className={adminCx(adminPrimaryButtonClassName, 'shrink-0 gap-2 disabled:opacity-60')}>
            <FiUpload aria-hidden="true" />
            {uploading ? 'Загрузка…' : 'Загрузить'}
          </button>
        </form>
      ) : null}
      <p className={adminHintClassName}>
        JPG, PNG или WEBP до 5 МБ — файл сожмётся в WEBP. Нажмите «Вставить в код», чтобы добавить
        картинку туда, где стоит курсор, или скопируйте готовый тег &lt;img&gt;.
      </p>

      {notice?.message ? (
        <div
          role={notice.status === 'error' ? 'alert' : 'status'}
          className={adminCx(
            'rounded-lg border px-4 py-3 text-sm',
            notice.status === 'error'
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800',
          )}>
          {notice.message}
        </div>
      ) : null}

      {images.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {images.map((image) => {
            const src = resolveMediaUrl(image.imageUrl) ?? '';
            const snippet = getSitePageImageSnippet(image);

            return (
              <li
                key={image.id}
                className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-[#0b5a45]/10 bg-white">
                <div className="flex h-36 items-center justify-center bg-[repeating-conic-gradient(#f1f4f1_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail of an uploaded file */}
                  <img src={src} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
                  <p className="truncate text-xs font-semibold text-[#0b3e31]" title={image.originalName}>
                    {image.originalName || src}
                  </p>
                  <p className="text-[11px] text-[#7e9088]">
                    {image.width && image.height ? `${image.width}×${image.height} · ` : ''}
                    {formatSize(image.byteSize)}
                  </p>
                  <code className="truncate rounded bg-[#f5f8f4] px-2 py-1 text-[11px] text-[#567068]" title={src}>
                    {src}
                  </code>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                    {onInsert ? (
                      <button
                        type="button"
                        onClick={() => onInsert(snippet)}
                        className={adminCx(adminSecondaryButtonClassName, 'h-8 min-h-8 gap-1.5 px-2.5 text-xs')}>
                        <FiCornerDownLeft aria-hidden="true" />
                        Вставить в код
                      </button>
                    ) : null}
                    <CopyButton icon={FiCode} label="<img>" value={snippet} />
                    <CopyButton icon={FiCopy} label="Ссылка" value={src} />
                    {canManage ? (
                      <form action={deleteAction} className="ml-auto">
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="pageId" value={pageId} />
                        <input type="hidden" name="imageId" value={image.id} />
                        <AdminDeleteButton
                          className={adminCx(adminDangerButtonClassName, 'h-8 min-h-8 w-8 px-0')}
                          confirmMessage="Удалить изображение? Если оно используется в HTML страницы, на сайте оно пропадёт."
                          iconOnly
                          pendingLabel="Удаление…">
                          Удалить
                        </AdminDeleteButton>
                      </form>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-[#0b5a45]/18 px-4 py-6 text-center text-sm text-[#7e9088]">
          Изображений пока нет.
        </p>
      )}
    </div>
  );
}
