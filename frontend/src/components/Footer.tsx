import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import ContactModalTrigger from './ContactModalTrigger';

export default function Footer() {
  const t = useTranslations('Footer');

  return (
    <footer className="relative overflow-hidden">
      <Image src="/footer3.webp" alt="" fill sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-black/50" />

      <div className="footer-section relative z-10 flex flex-col items-center gap-6 py-5 md:flex-row md:items-start">
        <div className="flex flex-col items-center gap-6 py-10 md:flex-row md:items-start md:gap-30">
          <ContactModalTrigger className="flex w-fit rounded-full bg-[#074031] px-6 py-3 text-lg text-white">
            {t('callOrder')}
          </ContactModalTrigger>

          <div className="flex flex-col ">
            <p
              className="max-w-2xl text-center text-sm text-white/85 md:text-start"
              style={{ fontWeight: 100 }}>
              {t('slogan')}
            </p>
            <p className="mt-3 max-w-2xl text-center text-xs leading-5 text-white/70 md:text-start">
              {t('seoText')}
            </p>
            <Link
              href="/privacy"
              className="text-center text-sm text-white/80 underline md:text-start ">
              {t('privacy')}
            </Link>
          </div>
        </div>
      </div>

      <p className="site-gutter relative z-10 bg-black/25 py-5 text-center text-sm text-white/80 md:text-start">
        {t('copyright')}
      </p>
    </footer>
  );
}
