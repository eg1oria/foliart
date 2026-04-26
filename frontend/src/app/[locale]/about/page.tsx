import type { Metadata } from 'next';
import ContactForm from '@/components/ContactForm';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { TbArrowBackUp } from 'react-icons/tb';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'About' });

  return buildPageMetadata({
    locale,
    path: '/about',
    title: locale === 'en' ? 'About the company' : 'О компании',
    description: t('subtitle'),
    image: '/about-head1.png',
  });
}

export default function About() {
  const t = useTranslations('About');

  return (
    <main>
      <div className="catalog-header relative flex flex-col items-center justify-center overflow-hidden py-14 pt-30 text-center md:pt-60">
        <Image src="/about-head1.png" alt="" fill sizes="100vw" className="object-cover -z-10" />
        <div className="absolute inset-0 bg-black/50 -z-10" />
        <h1 className="mb-4 text-3xl font-bold text-white md:text-5xl">{t('title')}</h1>
        <p className="mb-2 text-base text-lg text-white/70 md:text-xl">{t('subtitle')}</p>
        <Image src="/logo5.PNG" alt="Foliart logo" width={130} height={40} />
      </div>

      <div className="catalog-header flex gap-30 py-10">
        <aside className="hidden min-[1000px]:sticky min-[1000px]:top-24 min-[1000px]:block min-[1000px]:self-start min-[1000px]:min-w-[180px]">
          <nav>
            <ul className="flex flex-col">
              <li className="border-b border-l border-l-3 border-gray-200 transition-colors hover:border-l-gray-400 hover:bg-gray-100">
                <a
                  href="#description"
                  className="block py-3 pl-4 text-blue-500 transition-colors hover:text-gray-700">
                  {t('nav.description')}
                </a>
              </li>
              <li className="border-b border-l border-l-3 border-gray-200 transition-colors hover:border-l-gray-400 hover:bg-gray-100">
                <a
                  href="#feedback"
                  className="block py-3 pl-4 text-blue-500 transition-colors hover:text-gray-700">
                  {t('nav.feedback')}
                </a>
              </li>
              <li className="border-b border-l border-l-3 border-gray-200 transition-colors hover:border-l-gray-400 hover:bg-gray-100">
                <Link
                  href="/"
                  className="flex items-center gap-2 py-3 pl-4 text-gray-500 transition-colors hover:text-gray-700">
                  <TbArrowBackUp />
                  <span>{t('nav.back')}</span>
                </Link>
              </li>
            </ul>
          </nav>
        </aside>

        <div className="flex-1">
          <div id="description" className="mb-16 scroll-mt-28">
            <div className="flex flex-col gap-4 leading-relaxed text-gray-700">
              <p>{t('p1')}</p>
              <p>{t('p2')}</p>
              <p>{t('p3')}</p>
              <p>{t('p4')}</p>
              <p>{t('p5')}</p>
              <p>{t('p6')}</p>
              <p>{t('p7')}</p>
            </div>
          </div>

          <div
            id="feedback"
            className="scroll-mt-28 md:items-start items-center gap-10 md:gap=0 md:mt-0 flex flex-col-reverse md:grid md:grid-cols-2 justify-between relative mb-20 p-4 md:p-8">
            <Image src="/about-form.jpeg" alt="" fill sizes="100vw" className="object-cover -z-10" />
            <div className="absolute inset-0 bg-black/50 -z-10" />

            <div>
              <ContactForm />
            </div>
            <div>
              <div className="mb-5 h-1 w-[40%] rounded-sm bg-gray-400" />

              <h2 className="mb-4 text-xl font-bold text-white">{t('formTitle')}</h2>
              <p className="italic text-white/90">{t('formSubtitle')}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
