import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { FaPhoneAlt } from 'react-icons/fa';
import { IoIosMail } from 'react-icons/io';
import { TbArrowBackUp } from 'react-icons/tb';

import MediaImage from '@/components/catalog/MediaImage';
import { getPartners, type Partner } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media';
import { toPartnerCard } from '@/lib/partners';
import { buildPageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return buildPageMetadata({
    locale,
    path: '/about/partnery',
    title: locale === 'ru' ? 'Партнеры' : locale === 'es' ? 'Socios' : 'Partners',
    description:
      locale === 'ru'
        ? 'Региональные партнеры и дистрибьюторы продукции Фолиарт в Краснодаре и Крыму.'
        : locale === 'es'
          ? 'Socios regionales y distribuidores de los productos Foliart en Krasnodar y Crimea.'
          : 'Regional partners and distributors of Foliart products in Krasnodar and Crimea.',
    image: '/partners-head.webp',
  });
}

export default async function Partners({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Partners' });
  // A partner list that cannot be loaded should not take the whole page down;
  // the header still renders and the cards come back on the next request.
  const partners = await getPartners().catch(() => [] as Partner[]);
  const cards = partners.map(toPartnerCard).filter((card) => card.name);

  return (
    <main>
      <div className="catalog-header relative flex flex-col items-center justify-center overflow-hidden px-6 py-14 pt-30 text-center md:items-start md:pt-60">
        <Image
          src="/partners-head.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover -z-10 scale-120"
        />
        <div className="absolute inset-0 bg-black/50 -z-10" />
        <h1 className="mb-4 text-3xl font-bold text-white md:text-5xl">{t('title')}</h1>
      </div>

      {cards.length ? (
        <div className="catalog-header flex flex-col gap-12 py-26 md:flex-row md:flex-wrap">
          {cards.map((partner) => (
            <div
              key={partner.id}
              className="flex flex-col items-center gap-4 border-5 border-gray-400 p-10 text-center ">
              {partner.logoUrl ? (
                <MediaImage
                  src={resolveMediaUrl(partner.logoUrl)}
                  alt={partner.name}
                  width={220}
                  height={150}
                  className="h-[150px] w-[220px] object-contain"
                />
              ) : null}
              <p className="text-blue-600 font-medium">{partner.name}</p>
              {partner.address ? (
                <span className="font-bold text-black/65">{partner.address}</span>
              ) : null}
              {partner.phones.map((phone) => (
                <a
                  key={phone.href}
                  href={phone.href}
                  className="flex items-center gap-2 text-blue-500 hover:underline">
                  <FaPhoneAlt className="inline-block text-black" />
                  {phone.label}
                </a>
              ))}
              {partner.email ? (
                <a
                  href={`mailto:${partner.email}`}
                  className="flex items-center gap-2 text-blue-500 hover:underline">
                  <IoIosMail className="inline-block text-black" />
                  {partner.email}
                </a>
              ) : null}
              {partner.website ? (
                <a
                  href={partner.website.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-2 text-blue-500 hover:underline">
                  <TbArrowBackUp className="inline-block scale-x-[-1] text-black" />
                  {partner.website.label}
                </a>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </main>
  );
}
