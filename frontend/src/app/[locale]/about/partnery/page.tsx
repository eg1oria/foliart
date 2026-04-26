import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { FaPhoneAlt } from 'react-icons/fa';
import { IoIosMail } from 'react-icons/io';
import { TbArrowBackUp } from 'react-icons/tb';
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
    title: locale === 'en' ? 'Partners' : 'Партнеры',
    description:
      locale === 'en'
        ? 'Regional partners and distributors of Foliart products in Krasnodar and Crimea.'
        : 'Региональные партнеры и дистрибьюторы продукции Фолиарт в Краснодаре и Крыму.',
    image: '/partners-head.webp',
  });
}

export default function Partners() {
  const t = useTranslations('Partners');

  return (
    <main>
      <div className="catalog-header relative flex flex-col items:center md:items-start justify-center overflow-hidden px-6 py-14 pt-30 text-center md:pt-60">
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

      <div className="catalog-header flex flex-col gap-12 py-26 md:flex-row ">
        <div className="flex flex-col items-center gap-4 border-5 border-gray-400 p-10 text-center ">
          <Image src="/partners2.webp" alt="EcoGreen partner logo" width={220} height={150} />
          <p className="text-blue-600 font-medium">ООО &quot;ЭкоГрин&quot;</p>
          <span className="font-bold text-black/65">г.Краснодар</span>
          <a
            href="tel:+78612247537"
            className="flex items-center gap-2 text-blue-500 hover:underline">
            <FaPhoneAlt className="inline-block text-black" />
            +7 (861) 224-75-37
          </a>
          <a
            href="tel:+79898024378"
            className="flex items-center gap-2 text-blue-500 hover:underline">
            <FaPhoneAlt className="inline-block text-black" />
            +7 (989) 802 43 78
          </a>
          <a
            href="mailto:info@ecogreen.ru"
            className="flex items-center gap-2 text-blue-500 hover:underline">
            <IoIosMail className="inline-block text-black" />
            info@ecogreen.ru
          </a>
          <a
            href="https://ecogreen.ru"
            className="flex items-center gap-2 text-blue-500 hover:underline">
            <TbArrowBackUp className="inline-block scale-x-[-1] text-black" />
            https://ecogreen.ru
          </a>
        </div>

        <div className="flex flex-col items-center gap-4 border-5 border-gray-400 p-10 pb-20 text-center">
          <Image
            src="/partners1.webp"
            alt="Imperia Agro Krym partner logo"
            width={120}
            height={150}
          />
          <p className="text-blue-600 font-medium">ООО &quot;Империя Агро Крым&quot;</p>
          <span className="font-bold text-black/65">г. Симферополь</span>
          <a
            href="tel:+79787701041"
            className="mt-auto flex items-center gap-2 text-blue-500 hover:underline">
            <FaPhoneAlt className="inline-block text-black" />
            +7 (978) 770-10-41
          </a>
          <a
            href="mailto:iimperia-agro-Crimea@mail.ru"
            className="flex items-center gap-2 text-blue-500 hover:underline">
            <IoIosMail className="inline-block text-black" />
            iimperia-agro-Crimea@mail.ru
          </a>
        </div>
      </div>
    </main>
  );
}
