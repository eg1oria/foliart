import type { Metadata } from 'next';
import Advantages from '@/components/Advantages';
import Complexs from '@/components/Complexs';
import Hero from '@/components/Hero';
import { Link } from '@/i18n/routing';
import { buildPageMetadata } from '@/lib/seo';
import { useTranslations } from 'next-intl';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return buildPageMetadata({
    locale,
    path: '/',
    title: locale === 'en' ? 'Foliart - the art of fertilization' : 'Фолиарт - искусство удобрения',
    description:
      locale === 'en'
        ? 'Foliart develops organo-mineral fertilizer systems for farms with laboratory-backed agronomy support and plant nutrition expertise.'
        : 'Фолиарт разрабатывает органо-минеральные комплексы и системы питания растений для хозяйств с лабораторным сопровождением и агрономической экспертизой.',
    image: '/hero.webp',
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
