import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { resolveSiteImage } from '@/lib/media';
import { getSiteImageMap } from '@/lib/siteImagesServer';

export default async function Advantages() {
  const t = await getTranslations('Advantages');
  const siteImages = await getSiteImageMap();

  const items = [
    {
      title: t('items.item1.title'),
      img: resolveSiteImage(siteImages, 'home-advantage-1'),
      width: 430,
      height: 240,
    },
    {
      title: t('items.item2.title'),
      img: resolveSiteImage(siteImages, 'home-advantage-2'),
      width: 500,
      height: 167,
      desc: t('items.item2.desc'),
      right: true,
    },
    {
      title: t('items.item3.title'),
      img: resolveSiteImage(siteImages, 'home-advantage-3'),
      width: 360,
      height: 361,
      desc: t('items.item3.desc'),
    },
    {
      title: t('items.item4.title'),
      img: resolveSiteImage(siteImages, 'home-advantage-4'),
      width: 300,
      height: 500,
      desc: t('items.item4.desc'),
      right: true,
    },
    {
      title: t('items.item5.title'),
      img: resolveSiteImage(siteImages, 'home-advantage-5'),
      width: 500,
      height: 333,
    },
  ];

  return (
    <section className="advantages-section py-20 flex flex-col">
      <h2 className="text-4xl md:text-5xl font-bold text-center">{t('title')}</h2>
      <p className="text-center text-xl text-black/75 mt-6">{t('subtitle')}</p>
      <div className="flex flex-col gap-14 min-[1000px]:gap-30">
        {items.map((item) => (
          <div
            key={item.title}
            className={`flex flex-col-reverse items-center md:items-start min-[1000px]:items-start gap-8 mt-12 ${
              item.right ? 'min-[1000px]:flex-row-reverse' : 'min-[1000px]:flex-row'
            }`}>
            <Image
              src={item.img.src}
              alt={item.title}
              width={item.img.width ?? 500}
              height={item.img.height ?? item.height}
              sizes={`(max-width: 999px) 90vw, ${item.width}px`}
              className="h-auto w-full"
              style={{ maxWidth: item.width }}
            />
            <div>
              <h3 className="text-3xl max-w-xl min-[1000px]:text-4xl text-center md:text-start min-[1000px]:text-start font-semibold">
                {item.title}
              </h3>
              {item.desc && <p className="text-black/75 mt-4 max-w-2xl">{item.desc}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
