import ContactForm from '@/components/ContactForm';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { TbArrowBackUp } from 'react-icons/tb';
import { useTranslations } from 'next-intl';

export default function About() {
  const t = useTranslations('About');

  return (
    <section className="">
      <div className="relative flex flex-col items-center justify-center py-14 px-6 text-center overflow-hidden pt-60">
        <Image src="/about-head1.png" alt="" fill className="object-cover -z-10" />
        <div className="absolute inset-0 bg-black/50 -z-10" />
        <h1
          className="font-bold text-white mb-4"
          style={{
            fontSize: 55,
          }}>
          {t('title')}
        </h1>
        <p className="text-base text-xl text-white/70  mb-2">{t('subtitle')}</p>
        <Image src="/logo5.png" alt="Фолиарт" width={130} height={40} />
      </div>
      <div className="px-90  flex gap-30 px-20 py-16">
        <aside className="sticky top-24 self-start min-w-[180px]">
          <nav className="">
            <ul className="flex flex-col">
              <li className="border-b border-l border-l-3 border-gray-200 hover:bg-gray-100 transition-colors hover:border-l-gray-400">
                <a
                  href="#description"
                  className="block py-3 pl-4 text-blue-500 hover:text-gray-700 transition-colors">
                  {t('nav.description')}
                </a>
              </li>
              <li className="border-b border-l border-l-3 border-gray-200 hover:bg-gray-100 transition-colors hover:border-l-gray-400">
                <a
                  href="#feedback"
                  className="block py-3 pl-4 text-blue-500 hover:text-gray-700 transition-colors">
                  {t('nav.feedback')}
                </a>
              </li>
              <li className="border-b border-l border-l-3 border-gray-200 hover:bg-gray-100 transition-colors hover:border-l-gray-400">
                <Link
                  href="/"
                  className="flex items-center gap-2 py-3 pl-4 text-gray-500 hover:text-gray-700 transition-colors">
                  <TbArrowBackUp />
                  <span>{t('nav.back')}</span>
                </Link>
              </li>
            </ul>
          </nav>
        </aside>

        <div className="flex-1">
          <div id="description" className="mb-16 scroll-mt-28">
            <div className="text-gray-700 leading-relaxed flex flex-col gap-4">
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
            className="scroll-mt-28 grid grid-cols-2 justify-between relative mb-20 px-8 py-8">
            <Image src="/about-form.jpeg" alt="" fill className="object-cover -z-10" />
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
      </div>
    </section>
  );
}
