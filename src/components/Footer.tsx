import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

export default function Footer() {
  const t = useTranslations('Footer');

  return (
    <footer className="relative overflow-hidden">
      <Image src="/footer2.jpg" alt="Фон футера" fill className="object-cover" />
      <div className="absolute inset-0 bg-black/35" />

      <div className="px-90 py-5 relative z-10 flex flex-col items-start gap-6">
        <div className="flex gap-30 py-10">
          <button className="flex w-fit rounded-full bg-[#074031] px-6 text-lg py-3 text-white">
            {t('callOrder')}
          </button>
          <div className="flex flex-col">
            <p className="text-center text-sm text-white/85 max-w-2xl" style={{ fontWeight: 100 }}>
              {t('slogan')}
            </p>
            <Link href="/processing" className="text-sm underline text-white/80">
              {t('privacy')}
            </Link>
          </div>
        </div>
      </div>

      <p className="relative z-10 py-5 bg-black/25 text-sm text-white/80 px-90">{t('copyright')}</p>
    </footer>
  );
}
