import Image from 'next/image';
import { useTranslations } from 'next-intl';

export default function Hero() {
  const t = useTranslations('Hero');

  const items = [
    {
      title: t('items.item1'),
      img: '/hero-icon1.png',
    },
    {
      title: t('items.item2'),
      img: '/hero-icon2.png',
    },
    {
      title: t('items.item3'),
      img: '/hero-icon3.png',
    },
    {
      title: t('items.item4'),
      img: '/hero-icon4.png',
    },
  ];

  return (
    <section className="hero-section relative flex h-full md:min-h-screen flex-col items-center justify-start  md:justify-center pt-30 pb-20 md:pb-40 md:pt-40">
      <Image src="/hero.png" alt="" fill sizes="100vw" className="object-cover -z-10" priority />
      <div className="absolute inset-0 bg-black/50 -z-10" />
      <Image src="/logo5.PNG" alt="Foliart logo" width={500} height={80} className="mt-0 md:mt-20" />
      <h1 className="text-xl text-center text-white/85" style={{ fontWeight: 100 }}>
        {t('title')}
      </h1>

      <ul className="mt-20 grid w-full grid-cols-1 gap-8 justify-items-start tablet:justify-items-center tablet:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <li
            key={item.title}
            className="flex tablet:max-w-[250px] tablet:flex-col items-start tablet:items-center gap-9">
            <Image src={item.img} alt={item.title} width={50} height={50} />
            <span className="text-white/85 text-start tablet:text-center mt-2">{item.title}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
