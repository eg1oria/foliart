import { Link } from '@/i18n/routing';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { FaQuoteLeft } from 'react-icons/fa6';
import { HiOutlineMail, HiOutlinePhone } from 'react-icons/hi';

export default function SpecialistSection() {
  const t = useTranslations('Specialist');
  const contactT = useTranslations('Contacts');
  const phone = contactT('officePhone');
  const email = contactT('officeEmail');

  return (
    <div className="overflow-hidden  shadow-[0_30px_70px_-52px_rgba(11,62,49,0.75)]">
      <p className="text-center text-xs mb-2 uppercase tracking-[0.28em] text-[#7c817b] sm:text-sm">
        {t('eyebrow')}
      </p>
      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="relative overflow-hidden px-6 py-8 sm:px-8">
          <div className="pointer-events-none absolute left-5 top-5 h-18 w-18 border-l border-t border-[#e4e7e0]" />

          <div className="relative mx-auto w-full max-w-[210px] pb-8">
            <div className="relative aspect-square overflow-hidden rounded-full bg-[#d5dbe2]">
              <Image
                src="/specialist.webp"
                alt={t('imageAlt')}
                fill
                sizes="(max-width: 1280px) 210px, 240px"
                className="object-cover"
              />
            </div>

            <div className="absolute bottom-10 left-1/2 flex h-16 w-16 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full bg-[#0b5a45] text-white shadow-[0_16px_30px_-18px_rgba(11,62,49,0.9)]">
              <FaQuoteLeft size={28} aria-hidden="true" />
            </div>
          </div>

          <p className="mt-8 text-center text-[1.1rem] leading-8 text-[#8b8373] italic">
            {t('caption')}
          </p>
        </div>

        <div className=" bg-[#f2f2f0] px-6 py-8 sm:px-8 lg:px-10">
          <h2 className="mt-5 text-[1.5rem] font-bold leading-none text-[#0b3e31]">{t('name')}</h2>

          <div className="mt-5 h-[5px] w-24 rounded-full bg-[#0b5a45]" />

          <p className="mt-6 max-w-3xl text-base leading-5 text-[#243238] sm:text-[1rem]">
            {t('description')}
          </p>

          <div className="mt-8 border-t border-[#d8ddd6] pt-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <Link
                href="/contacts"
                className="inline-flex items-center justify-center rounded-full bg-[#0b5a45] px-6 py-3 text-base font-medium text-white transition hover:bg-[#094635] sm:min-w-[210px]">
                {t('action')}
              </Link>

              <div className="space-y-3">
                <a
                  href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                  className="flex items-center gap-3 text-[1.3rem] font-semibold text-[#111827] transition hover:text-[#0b5a45]">
                  <HiOutlinePhone className="shrink-0 text-[1.35rem] text-[#9aa3ac]" />
                  <span>{phone}</span>
                </a>

                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-3 text-base text-[#3d76f6] transition hover:text-[#0b5a45] sm:text-lg">
                  <HiOutlineMail className="shrink-0 text-[1.3rem] text-[#9aa3ac]" />
                  <span>{email}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
