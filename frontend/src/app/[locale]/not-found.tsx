'use client';

import { useLocale, useTranslations } from 'next-intl';

export default function NotFoundPage() {
  const locale = useLocale();
  const t = useTranslations('NotFound');

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 pb-20 pt-40 text-center md:pt-60">
      <div className="max-w-lg">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6a7f76]">404</p>
        <h1 className="mt-3 text-3xl font-semibold text-[#10283d]">{t('title')}</h1>
        <p className="mt-4 leading-7 text-[#5f726b]">{t('description')}</p>
        <a
          href={`/${locale}`}
          className="mt-8 inline-flex rounded-full bg-[#0b5a45] px-6 py-3 font-medium text-white hover:bg-[#074031]"
        >
          {t('home')}
        </a>
      </div>
    </main>
  );
}
