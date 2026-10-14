'use client';

import { useLocale, useTranslations } from 'next-intl';

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations('ErrorPage');

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 pb-20 pt-40 text-center md:pt-60">
      <div className="max-w-lg">
        <h1 className="text-3xl font-semibold text-[#10283d]">{t('title')}</h1>
        <p className="mt-4 leading-7 text-[#5f726b]">{t('description')}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-[#0b5a45] px-6 py-3 font-medium text-white hover:bg-[#074031]"
          >
            {t('retry')}
          </button>
          <a
            href={`/${locale}`}
            className="rounded-full border border-[#0b5a45]/20 px-6 py-3 font-medium text-[#0b5a45] hover:bg-[#eef4ef]"
          >
            {t('home')}
          </a>
        </div>
      </div>
    </main>
  );
}
