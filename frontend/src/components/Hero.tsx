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
    <section className="relative px-90 py-40 flex flex-col items-center justify-center min-h-screen">
      <Image src="/hero.png" alt="" fill className="object-cover -z-10" priority />
      <div className="absolute inset-0 bg-black/50 -z-10" />
      <Image src="/logo5.png" alt="Logo" width={500} height={80} className="mt-20" />
      <h1 className="text-xl text-center text-white/85" style={{ fontWeight: 100 }}>
        {t('title')}
      </h1>

      <ul className="flex justify-between mt-20 w-full max-w-6xl">
        {items.map((item) => (
          <li key={item.title} className="flex flex-col gap-9 items-center max-w-[240px]">
            <Image src={item.img} alt={item.title} width={50} height={50} />
            <span className="text-white/85 text-center mt-2">{item.title}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
