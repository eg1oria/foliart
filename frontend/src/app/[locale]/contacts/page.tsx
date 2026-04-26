import type { Metadata } from 'next';
import ContactForm from '@/components/ContactForm';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { FaMapMarkerAlt } from 'react-icons/fa';
import { IoIosMail } from 'react-icons/io';
import { TbArrowBackUp } from 'react-icons/tb';
import { buildPageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Contacts' });

  return buildPageMetadata({
    locale,
    path: '/contacts',
    title: locale === 'en' ? 'Contacts' : 'Контакты',
    description: t('subtitle'),
    image: '/contacts.jpg',
  });
}

export default function Contacts() {
  const t = useTranslations('Contacts');
  const mapWidgetSrc =
    'https://yandex.ru/map-widget/v1/?text=%D0%9A%D1%80%D0%B0%D1%81%D0%BD%D0%BE%D0%B4%D0%B0%D1%80%2C+%D1%83%D0%BB.+%D0%A1%D0%BE%D0%BB%D0%BD%D0%B5%D1%87%D0%BD%D0%B0%D1%8F%2C+10%2F3&z=16&ll=39.015,45.040';
  const mapTitle = `${t('officeTitle')} - ${t('showMap')}`;

  const renderOfficeCard = (className: string) => (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
        {t('officeLabel')}
      </p>
      <a
        href={`tel:${t('officePhone').replace(/[^\d+]/g, '')}`}
        className="text-lg font-semibold text-blue-600 hover:underline">
        {t('officePhone')}
      </a>
      <hr className="border-gray-200" />
      <a href={`mailto:${t('officeEmail')}`} className="text-blue-600 hover:underline">
        {t('officeEmail')}
      </a>
      <hr className="border-gray-200" />
      <p className="text-sm leading-snug text-gray-700">{t('officeAddress')}</p>
    </div>
  );

  return (
    <main>
      <section className="catalog-header relative flex flex-col justify-center overflow-hidden px-6 pb-16 pt-30 md:pt-60">
        <Image src="/contacts.jpg" alt="" fill sizes="100vw" className="object-cover -z-10" />
        <div className="absolute inset-0 bg-black/50 -z-10" />
        <h1 className="mb-4 text-3xl font-bold text-white md:text-5xl">{t('title')}</h1>
        <p className="mb-2 text-sm text-white/90 md:text-lg">{t('subtitle')}</p>
      </section>

      <div className="catalog-header flex gap-30 py-10">
        <div className="gap-30">
          <div id="office" className="scroll-mt-28 flex min-w-0 flex-1 flex-col gap-4">
            <h2 className="text-2xl font-bold text-gray-900 md:text-4xl">{t('officeTitle')}</h2>
            <p className="mb-4 text-sm text-gray-500 md:text-lg">{t('officeHours')}</p>

            <div className="flex flex-col gap-4 lg:hidden">
              {renderOfficeCard('flex flex-col gap-4 bg-white p-6 shadow-lg')}
              <details>
                <summary className="cursor-pointer list-none bg-black/20 px-6 py-3 text-center text-sm font-semibold text-black/50 transition hover:bg-[#013a2e]">
                  {t('showMap')}
                </summary>
                <div
                  className="relative mt-4 overflow-hidden rounded-[1rem]"
                  style={{ height: 360 }}>
                  <iframe
                    title={mapTitle}
                    src={mapWidgetSrc}
                    width="100%"
                    height="100%"
                    allowFullScreen
                    style={{ display: 'block' }}
                  />
                </div>
              </details>
            </div>

            <div className="relative hidden lg:block" style={{ height: 460 }}>
              <iframe
                title={mapTitle}
                src={mapWidgetSrc}
                width="100%"
                height="100%"
                allowFullScreen
                style={{ display: 'block' }}
              />
              {renderOfficeCard(
                'absolute top-4 left-4 z-10 flex w-68 flex-col gap-4 bg-white p-6 shadow-lg',
              )}
            </div>
          </div>
          <div
            id="feedback"
            className="scroll-mt-28 md:items-start items-center gap-10 md:gap=0 mt-10 flex flex-col-reverse md:grid md:grid-cols-2 justify-between relative mb-20 p-4  md:p-8">
            <Image src="/about-head1.png" alt="" fill sizes="100vw" className="object-cover -z-10" />
            <div className="absolute inset-0 bg-black/50 -z-10" />

            <div className="">
              <ContactForm />
            </div>
            <div className="">
              <div className="mb-5 h-1 w-[40%] rounded-sm bg-gray-400" />
              <h2 className="mb-4 text-xl font-bold text-white">{t('formTitle')}</h2>
              <p className="italic text-white/90">{t('formSubtitle')}</p>
            </div>
          </div>
        </div>

        <aside className="hidden min-[1000px]:sticky min-[1000px]:top-50 min-[1000px]:block min-[1000px]:self-start min-[1000px]:min-w-[180px]">
          <nav>
            <ul className="flex flex-col">
              <li className="border-b border-l border-l-3 border-gray-200 transition-colors hover:border-l-gray-400 hover:bg-gray-100">
                <a
                  href="#office"
                  className="flex items-center gap-2 py-3 pl-2 text-sm text-blue-500 transition-colors hover:text-blue-700">
                  <FaMapMarkerAlt className="text-xs text-blue-400" />
                  {t('nav.office')}
                </a>
              </li>
              <li className="border-b border-l border-l-3 border-gray-200 transition-colors hover:border-l-gray-400 hover:bg-gray-100">
                <a
                  href="#feedback"
                  className="flex items-center gap-2 py-3 pl-2 text-sm text-blue-500 transition-colors hover:text-blue-700">
                  <IoIosMail className="text-blue-400" />
                  {t('nav.feedback')}
                </a>
              </li>
              <li className="border-l border-l-3 border-gray-200 transition-colors hover:border-l-gray-400 hover:bg-gray-100">
                <Link
                  href="/"
                  className="flex items-center gap-2 py-3 pl-2 text-sm text-gray-500 transition-colors hover:text-gray-700">
                  <TbArrowBackUp />
                  {t('nav.back')}
                </Link>
              </li>
            </ul>
          </nav>
        </aside>
      </div>
    </main>
  );
}
