import Image from 'next/image';
import { useTranslations } from '@/lib/mock-intl'; // TODO: вернуть 'next-intl'

export default function Advantages() {
  const t = useTranslations('Advantages');

  const items = [
    {
      title: t('items.item1.title'),
      img: '/advantage1.png',
    },
    {
      title: t('items.item2.title'),
      img: '/advantage2.jpeg',
      desc: t('items.item2.desc'),
      right: true,
    },
    {
      title: t('items.item3.title'),
      img: '/advantage3.png',
      desc: t('items.item3.desc'),
    },
    {
      title: t('items.item4.title'),
      img: '/advantage4.jpg',
      desc: t('items.item4.desc'),
      right: true,
    },
    {
      title: t('items.item5.title'),
      img: '/advantage5.png',
    },
  ];

  return (
    <section className="px-90 py-20 flex flex-col">
      <h2 className="text-5xl font-bold text-center">{t('title')}</h2>
      <p className="text-center text-xl text-black/75 mt-6">{t('subtitle')}</p>
      <div className="flex flex-col gap-30">
        {items.map((item) => (
          <div
            key={item.title}
            className={`flex items-start gap-8 mt-12 ${item.right ? 'flex-row-reverse' : ''}`}>
            <Image src={item.img} alt={item.title} width={500} height={80} />
            <div>
              <h3 className="text-4xl font-semibold">{item.title}</h3>
              {item.desc && <p className="text-black/75 mt-4 max-w-2xl">{item.desc}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
