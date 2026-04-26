import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

export default function Footer() {
  const t = useTranslations('Footer');

  return (
    <footer className="relative overflow-hidden">
      <Image src="/footer3.png" alt="" fill sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-black/45" />

      <div className="footer-section relative z-10 flex flex-col items-center gap-6 py-5 md:flex-row md:items-start">
        <div className="flex flex-col items-center gap-6 py-10 md:flex-row md:items-start md:gap-30">
          <Link
            href="/contacts"
            className="flex w-fit rounded-full bg-[#074031] px-6 py-3 text-lg text-white">
            {t('callOrder')}
          </Link>

          <div className="flex flex-col ">
            <p
              className="max-w-2xl text-center text-sm text-white/85 md:text-start"
              style={{ fontWeight: 100 }}>
              {t('slogan')}
            </p>
            <Link
              href="/privacy"
              className="text-center text-sm text-white/80 underline md:text-start ">
              {t('privacy')}
            </Link>
          </div>
        </div>
      </div>

      <p className="relative z-10 bg-black/25 px-6 py-5 text-center text-sm text-white/80 md:px-90 md:text-start">
        {t('copyright')}
      </p>
    </footer>
  );
}
