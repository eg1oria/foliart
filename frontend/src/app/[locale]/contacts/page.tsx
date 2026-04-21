import ContactForm from '@/components/ContactForm';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { FaMapMarkerAlt } from 'react-icons/fa';
import { IoIosMail } from 'react-icons/io';
import { TbArrowBackUp } from 'react-icons/tb';

export default function Contacts() {
  const t = useTranslations('Contacts');
  return (
    <div className="">
      <div className="relative flex flex-col items-start px-90 justify-center py-14 px-6 text-center overflow-hidden pt-60">
        <Image src="/contacts.jpg" alt="" fill className="object-cover -z-10" />
        <div className="absolute inset-0 bg-black/50 -z-10" />
        <h1 className="font-bold text-white mb-4" style={{ fontSize: 55 }}>
          {t('title')}
        </h1>
        <p className="text-sm text-white/90 mb-2">{t('subtitle')}</p>
      </div>

      <div className="px-90 py-10 flex gap-30">
        {/* Левая колонка: заголовок + карта */}
        <div className="gap-30">
          <div id="office" className="scroll-mt-28 flex-1 flex flex-col gap-4 min-w-0">
            <h2 className="text-4xl font-bold text-gray-900">{t('officeTitle')}</h2>
            <p className="text-gray-500 text-ls mb-4">{t('officeHours')}</p>

            <div className="relative" style={{ height: 460 }}>
              <iframe
                src="https://yandex.ru/map-widget/v1/?text=Краснодар%2C+ул.+Солнечная%2C+10%2F3&z=16&ll=39.015,45.040"
                width="100%"
                height="100%"
                allowFullScreen
                style={{ display: 'block' }}
              />
              {/* Панель поверх карты */}
              <div className="absolute top-4 left-4 bg-white shadow-lg flex flex-col gap-4 p-6 w-68 z-10">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  {t('officeLabel')}
                </p>
                <a
                  href={`tel:${t('officePhone').replace(/[^\d+]/g, '')}`}
                  className="text-blue-600 font-semibold text-lg hover:underline">
                  {t('officePhone')}
                </a>
                <hr className="border-gray-200" />
                <a href={`mailto:${t('officeEmail')}`} className="text-blue-600 hover:underline">
                  {t('officeEmail')}
                </a>
                <hr className="border-gray-200" />
                <p className="text-sm text-gray-700 leading-snug">{t('officeAddress')}</p>
              </div>
            </div>
          </div>
          <div
            id="feedback"
            className="scroll-mt-28 grid grid-cols-2 gap-20 justify-between relative mb-20 mt-30 px-8 py-8">
            <Image src="/about-head1.png" alt="" fill className="object-cover -z-10" />
            <div className="absolute inset-0 bg-black/50 -z-10" />

            <div className="">
              <ContactForm />
            </div>
            <div className="">
              <div className="h-1 w-[40%] bg-gray-400 rounded-sm mb-5" />
              <h2 className="text-xl font-bold text-white mb-4">{t('formTitle')}</h2>
              <p className="text-white/90 italic">{t('formSubtitle')}</p>
            </div>
          </div>
        </div>

        {/* Правая колонка: навигация */}
        <aside className="sticky top-50 self-start min-w-[180px]">
          <nav>
            <ul className="flex flex-col">
              <li className="border-b border-l border-l-3 border-gray-200 hover:bg-gray-100 transition-colors hover:border-l-gray-400">
                <a
                  href="#office"
                  className="flex items-center gap-2 py-3 pl-2 text-blue-500 hover:text-blue-700 transition-colors text-sm">
                  <FaMapMarkerAlt className="text-blue-400 text-xs" />
                  {t('nav.office')}
                </a>
              </li>
              <li className="border-b border-l border-l-3 border-gray-200 hover:bg-gray-100 transition-colors hover:border-l-gray-400">
                <a
                  href="#feedback"
                  className="flex items-center gap-2 py-3 pl-2 text-blue-500 hover:text-blue-700 transition-colors text-sm">
                  <IoIosMail className="text-blue-400" />
                  {t('nav.feedback')}
                </a>
              </li>
              <li className="border-l border-l-3 border-gray-200 hover:bg-gray-100 transition-colors hover:border-l-gray-400">
                <Link
                  href="/"
                  className="flex items-center gap-2 py-3 pl-2 text-gray-500 hover:text-gray-700 transition-colors text-sm">
                  <TbArrowBackUp />
                  {t('nav.back')}
                </Link>
              </li>
            </ul>
          </nav>
        </aside>
      </div>
    </div>
  );
}
