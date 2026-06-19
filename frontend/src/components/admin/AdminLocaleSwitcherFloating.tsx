'use client';

import { Link } from '@/i18n/routing';
import { withContentLocale } from '@/lib/contentLocales';
import { useEffect, useState } from 'react';

import { adminCx } from './adminStyles';

export function AdminLocaleSwitcherFloating({
  activeTab,
  contentLocale,
  contentLocales,
  getContentLocaleLabel,
  headerRef,
  hint,
  title,
}: {
  activeTab: string;
  contentLocale: string;
  contentLocales: readonly string[];
  getContentLocaleLabel: (locale: string) => string;
  headerRef: React.RefObject<HTMLElement | null>;
  hint: string;
  title: string;
}) {
  const [visible, setVisible] = useState(false);
  const currentAdminHref = `/admin/${activeTab}`;

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(header);
    return () => observer.disconnect();
  }, [headerRef]);

  return (
    <div
      aria-hidden={!visible}
      className={adminCx(
        'fixed bottom-5 right-5 z-50 rounded-xl border border-[#0b5a45]/15 bg-white shadow-[0_8px_32px_-8px_rgba(11,62,49,0.22)] transition-all duration-200',
        visible
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : 'translate-y-3 opacity-0 pointer-events-none',
      )}>
      <div className="px-3 pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6a7f76]">
          {title}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-1.5 p-2">
        {contentLocales.map((item) => {
          const isActive = item === contentLocale;
          return (
            <Link
              key={item}
              href={withContentLocale(currentAdminHref, item)}
              scroll={false}
              aria-current={isActive ? 'true' : undefined}
              className={adminCx(
                'inline-flex min-h-9 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition',
                isActive
                  ? 'border-[#0b5a45] bg-[#0b5a45] text-white'
                  : 'border-[#0b5a45]/10 bg-[#f7f9f6] text-[#0b3e31] hover:border-[#0b5a45]/25 hover:bg-[#eef4ef]',
              )}>
              {getContentLocaleLabel(item)}
            </Link>
          );
        })}
      </div>
      <p className="px-3 pb-2.5 text-[11px] leading-4 text-[#6a7f76]">{hint}</p>
    </div>
  );
}
