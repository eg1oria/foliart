import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';

export default function Hero() {
  const t = useTranslations('Hero');
  const locale = useLocale();
  const isRu = locale === 'ru';
  const logoSrc = isRu ? '/logo5.PNG' : '/logo_eng-w.webp';
  const logoWidth = 440;
  const logoHeight = isRu ? 238 : 262;

  const items = [
    {
      title: t('items.item1'),
      img: '/hero-icon1.webp',
    },
    {
      title: t('items.item2'),
      img: '/hero-icon2.webp',
    },
    {
      title: t('items.item3'),
      img: '/hero-icon3.webp',
    },
    {
      title: t('items.item4'),
      img: '/hero-icon4.webp',
    },
  ];

  return (
    <section className="hero-section relative flex min-h-[100svh] flex-col items-center justify-start pb-20 pt-30 md:justify-center md:pb-40 md:pt-40">
      <Image src="/hero.webp" alt="" fill sizes="100vw" className="object-cover -z-10" priority />
      <div className="absolute inset-0 bg-black/50 -z-10" />
      <Image
        src={logoSrc}
        alt="Foliart logo"
        width={logoWidth}
        height={logoHeight}
        priority
        sizes="(max-width: 767px) calc(100vw - 32px), 520px"
        className={`mt-0 h-auto ${isRu ? 'md:mt-20' : 'md:mt-13'}`}
        style={{
          width: `min(${logoWidth}px, calc(100vw - 32px))`,
          maxWidth: '100%',
        }}
      />
      <h1
        className="w-full max-w-3xl text-center text-xl text-white/85"
        style={{ fontWeight: 100 }}
      >
        {t('title')}
      </h1>

      <ul className="mt-20 grid w-full grid-cols-1 gap-8 justify-items-start tablet:justify-items-center tablet:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <li
            key={item.title}
            className="flex w-full min-w-0 items-start gap-5 tablet:max-w-[250px] tablet:flex-col tablet:items-center tablet:gap-9"
          >
            <Image
              src={item.img}
              alt={item.title}
              width={45}
              height={45}
              className="h-auto w-auto shrink-0"
            />
            <span className="mt-2 min-w-0 flex-1 text-start text-white/85 tablet:text-center">
              {item.title}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
