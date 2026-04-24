import type { ReactNode } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { TbArrowBackUp } from 'react-icons/tb';
import { Link } from '@/i18n/routing';

type PrivacySectionId =
  | 'general'
  | 'terms'
  | 'data'
  | 'goals'
  | 'grounds'
  | 'process'
  | 'transfer'
  | 'final';

type PrivacySection = {
  id: PrivacySectionId;
  itemCount: number;
  paragraphCount?: number;
};

const sections: readonly PrivacySection[] = [
  { id: 'general', paragraphCount: 1, itemCount: 2 },
  { id: 'terms', itemCount: 13 },
  { id: 'data', itemCount: 4 },
  { id: 'goals', itemCount: 3 },
  { id: 'grounds', itemCount: 2 },
  { id: 'process', paragraphCount: 1, itemCount: 4 },
  { id: 'transfer', itemCount: 2 },
  { id: 'final', itemCount: 3 },
];

const sectionClassName = 'scroll-mt-28 border-b border-[#e7eaec] pb-8 last:border-b-0 last:pb-0';
const titleClassName = 'text-2xl font-bold text-[#0e2438] md:text-3xl';
const textClassName = 'text-base leading-8 text-[#243238]';
const listClassName = 'list-decimal space-y-4 pl-6 text-base leading-8 text-[#243238]';
const linkClassName = 'text-blue-600 underline-offset-4 hover:underline';

export default function PrivacyPage() {
  const t = useTranslations('Privacy');

  const renderRichText = (key: string): ReactNode =>
    t.rich(key, {
      site: (chunks) => (
        <a href="https://фолиарт.рф" className={linkClassName}>
          {chunks}
        </a>
      ),
      email: (chunks) => (
        <a href="mailto:mail@foliart.me" className={linkClassName}>
          {chunks}
        </a>
      ),
      privacy: (chunks) => (
        <a href="https://фолиарт.рф/privacy" className={linkClassName}>
          {chunks}
        </a>
      ),
    });

  return (
    <section>
      <div className="catalog-header relative flex flex-col justify-center overflow-hidden px-6 pb-16 pt-30 md:pt-60">
        <Image src="/about-head1.png" alt="" fill className="object-cover -z-10" />
        <div className="absolute inset-0 bg-black/55 -z-10" />
        <h1 className="mb-4 text-3xl font-bold text-white md:text-5xl">{t('title')}</h1>
        <p className="max-w-3xl text-sm text-white/90 md:text-lg">{t('subtitle')}</p>
      </div>

      <div className="catalog-header flex gap-30 py-10">
        <aside className="hidden min-[1000px]:sticky min-[1000px]:top-30 min-[1000px]:block min-[1000px]:self-start min-[1000px]:min-w-[220px]">
          <nav className="max-w-[340px]">
            <ul className="flex flex-col">
              {sections.map((section) => (
                <li
                  key={section.id}
                  className="border-b border-l border-l-3 border-gray-200 transition-colors hover:border-l-gray-400 hover:bg-gray-100">
                  <a
                    href={`#${section.id}`}
                    className="block py-3 pl-4 pr-4 text-sm leading-6 text-blue-500 transition-colors hover:text-blue-700">
                    {t(`sections.${section.id}.title`)}
                  </a>
                </li>
              ))}
              <li className="border-l border-l-3 border-gray-200 transition-colors hover:border-l-gray-400 hover:bg-gray-100">
                <Link
                  href="/"
                  className="flex items-center gap-2 py-3 pl-4 pr-4 text-sm text-gray-500 transition-colors hover:text-gray-700">
                  <TbArrowBackUp />
                  <span>{t('back')}</span>
                </Link>
              </li>
            </ul>
          </nav>
        </aside>

        <article className="min-w-0 max-w-5xl flex-1 break-words">
          <div className="space-y-8">
            {sections.map((section) => {
              const paragraphs = Array.from({ length: section.paragraphCount ?? 0 }, (_, index) =>
                renderRichText(`sections.${section.id}.paragraphs.${index}`),
              );
              const items = Array.from({ length: section.itemCount }, (_, index) =>
                renderRichText(`sections.${section.id}.items.${index}`),
              );

              return (
                <section id={section.id} key={section.id} className={sectionClassName}>
                  <h2 className={titleClassName}>{t(`sections.${section.id}.title`)}</h2>

                  {paragraphs.length > 0 ? (
                    <div className="mt-5 space-y-4">
                      {paragraphs.map((paragraph, index) => (
                        <p key={`${section.id}-paragraph-${index}`} className={textClassName}>
                          {paragraph}
                        </p>
                      ))}
                      <ol className={listClassName}>
                        {items.map((item, index) => (
                          <li key={`${section.id}-item-${index}`}>{item}</li>
                        ))}
                      </ol>
                    </div>
                  ) : (
                    <ol className={`${listClassName} mt-5`}>
                      {items.map((item, index) => (
                        <li key={`${section.id}-item-${index}`}>{item}</li>
                      ))}
                    </ol>
                  )}
                </section>
              );
            })}
          </div>
        </article>
      </div>
    </section>
  );
}
