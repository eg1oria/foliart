import type { Metadata } from 'next';
import Advantages from '@/components/Advantages';
import Complexs from '@/components/Complexs';
import Hero from '@/components/Hero';
import { Link } from '@/i18n/routing';
import { buildPageMetadata } from '@/lib/seo';
import { getSiteImage } from '@/lib/siteImagesServer';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Seo' });

  return buildPageMetadata({
    locale,
    path: '/',
    title: t('homeTitle'),
    description: t('homeDescription'),
    image: (await getSiteImage('home-hero')).src,
  });
}

export default function Home() {
  const t = useTranslations('Home');

  return (
    <main>
      <Hero />
      <Complexs />
      <Advantages />
      <Link
        href="/catalog"
        className="flex w-fit rounded-full bg-[#074031] mx-auto px-8 py-5 mt-10 mb-20 text-white">
        {t('catalogButton')}
      </Link>
    </main>
  );
}
