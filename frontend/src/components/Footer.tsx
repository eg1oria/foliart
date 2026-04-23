import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

export default function Footer() {
  const t = useTranslations('Footer');

  return (
    <footer className="relative overflow-hidden">
      <Image src="/footer3.png" alt="Фон футера" fill className="object-cover" />
      <div className="absolute inset-0 bg-black/45" />

      <div className="footer-section relative z-10 flex flex-col items-center md:items-start gap-6 py-5 md:flex-row">
        <div className="flex flex-col gap-6 py-10 md:flex-row md:gap-30 items-center md:items-start">
          <button className="flex w-fit rounded-full bg-[#074031] px-6 py-3 text-lg text-white">
            {t('callOrder')}
          </button>

          <div className="flex flex-col ">
            <p
              className="max-w-2xl text-sm text-white/85 md:text-center text-center md:text-start "
              style={{ fontWeight: 100 }}>
              {t('slogan')}
            </p>
            <Link href="#" className="text-sm text-white/80 underline text-center md:text-start ">
              {t('privacy')}
            </Link>
          </div>
        </div>
      </div>

      <p className="relative z-10 bg-black/25 px-6 py-5 text-center md:text-start text-sm text-white/80 md:px-90">
        {t('copyright')}
      </p>
    </footer>
  );
}
