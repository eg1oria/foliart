import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { resolveSiteImage } from '@/lib/media';
import { getSiteImageMap } from '@/lib/siteImagesServer';

export default async function Complexs() {
  const t = await getTranslations('Complexs');
  const siteImages = await getSiteImageMap();
  const background = resolveSiteImage(siteImages, 'home-complex-bg');
  const photo = resolveSiteImage(siteImages, 'home-complex-photo');

  return (
    <section className="complex-section relative flex flex-col items-center gap-10 py-16 min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-between min-[900px]:gap-18 min-[900px]:py-20">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-no-repeat opacity-50"
        style={{
          backgroundImage: `url('${background.src}')`,
          backgroundPosition: 'center calc(10% + 200px)',
        }}
      />
      <Image
        src={photo.src}
        alt={t('title')}
        width={photo.width ?? 450}
        height={photo.height ?? 300}
        className="relative z-10 w-full max-w-[450px] px-8 min-[900px]:px-0 min-[900px]:-mt-25"
      />
      <div className="relative z-10 max-w-2xl">
        <h2 className="mt-6 text-center min-[900px]:text-start text-4xl font-bold min-[900px]:mt-10 min-[900px]:text-5xl">
          {t('title')}
        </h2>
        <p className="mt-6 max-w-2xl text-center min-[900px]:text-start text-lg text-black/75 min-[900px]:text-xl">
          {t('desc1')}
        </p>
        <p className="mt-6 max-w-2xl text-start text-black">{t('desc2')}</p>
      </div>
    </section>
  );
}
