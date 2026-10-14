'use client';

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { FiMonitor, FiRefreshCw, FiSmartphone, FiTablet } from 'react-icons/fi';

import { getSitePageSandbox } from '@/lib/sitePageFrame';

import { adminCx, adminSecondaryButtonClassName } from '../adminStyles';

const frameName = 'site-page-preview';

const widths = [
  { key: 'desktop', label: 'Компьютер', icon: FiMonitor, width: null },
  { key: 'tablet', label: 'Планшет', icon: FiTablet, width: 768 },
  { key: 'phone', label: 'Телефон', icon: FiSmartphone, width: 390 },
] as const;

export type SitePagePreviewHandle = {
  show: (input: { html: string; locale: string; title: string }) => void;
};

/**
 * The unsaved HTML is posted into the frame, and `/page-frame/preview` sends it
 * back under the same sandbox the published page gets — so scripts, fonts and
 * CDNs behave exactly as they will on the site.
 */
const SitePagePreview = forwardRef<SitePagePreviewHandle, { onRefresh: () => void }>(
  function SitePagePreview({ onRefresh }, ref) {
    const formRef = useRef<HTMLFormElement>(null);
    const htmlRef = useRef<HTMLInputElement>(null);
    const localeRef = useRef<HTMLInputElement>(null);
    const titleRef = useRef<HTMLInputElement>(null);
    const [width, setWidth] = useState<(typeof widths)[number]['key']>('desktop');
    const [shown, setShown] = useState(false);
    const frameWidth = widths.find((item) => item.key === width)?.width ?? null;

    useImperativeHandle(ref, () => ({
      show({ html, locale, title }) {
        if (!formRef.current || !htmlRef.current || !localeRef.current || !titleRef.current) {
          return;
        }

        htmlRef.current.value = html;
        localeRef.current.value = locale;
        titleRef.current.value = title;
        formRef.current.submit();
        setShown(true);
      },
    }));

    return (
      <div className="rounded-lg border border-[#0b5a45]/10 bg-[#f7f9f6] p-3 sm:p-4">
        <form
          ref={formRef}
          method="post"
          action="/page-frame/preview"
          target={frameName}
          className="hidden">
          <input ref={htmlRef} type="hidden" name="html" />
          <input ref={localeRef} type="hidden" name="locale" />
          <input ref={titleRef} type="hidden" name="title" />
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="group"
            aria-label="Ширина предпросмотра"
            className="flex items-center gap-0.5 rounded-lg border border-[#0b5a45]/12 bg-white p-1">
            {widths.map((item) => {
              const Icon = item.icon;
              const active = item.key === width;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setWidth(item.key)}
                  aria-pressed={active}
                  className={adminCx(
                    'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition',
                    active ? 'bg-[#0b5a45] text-white' : 'text-[#6a7f76] hover:bg-[#eef4ef]',
                  )}>
                  <Icon aria-hidden="true" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onRefresh}
            className={adminCx(adminSecondaryButtonClassName, 'gap-2')}>
            <FiRefreshCw aria-hidden="true" />
            Обновить предпросмотр
          </button>
        </div>

        <div className="mt-3 overflow-x-auto rounded-md border border-[#0b5a45]/10 bg-[#e9eee9]">
          <div
            className="relative mx-auto bg-white transition-[width] duration-200"
            style={{ width: frameWidth ? `${frameWidth}px` : '100%' }}>
            {!shown ? (
              <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-[#7e9088]">
                Вставьте HTML и нажмите «Обновить предпросмотр».
              </p>
            ) : null}
            <iframe
              name={frameName}
              title="Предпросмотр страницы"
              sandbox={getSitePageSandbox('preview')}
              className="relative block h-[75vh] min-h-[480px] w-full border-0"
            />
          </div>
        </div>
      </div>
    );
  },
);

export default SitePagePreview;
