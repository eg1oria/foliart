'use client';

import Image from 'next/image';
import { useEffect, useTransition } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import { RxCross1 } from 'react-icons/rx';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { formatProductCount } from '@/lib/catalog';
import { useLocale, useTranslations } from 'next-intl';
import ContactModalTrigger from './ContactModalTrigger';

type LocaleOption = 'ru' | 'en';

type CatalogChild = {
  name: string;
  href: string;
  image?: string;
  count?: number;
};

type FullscreenMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  catalogChildren?: CatalogChild[];
  calendarChildren?: CatalogChild[];
};

export default function FullscreenMenu({
  isOpen,
  onClose,
  catalogChildren = [],
  calendarChildren = [],
}: FullscreenMenuProps) {
  const t = useTranslations('Header');
  const footerT = useTranslations('Footer');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const localeOptions: LocaleOption[] = ['ru', 'en'];

  const changeLocale = (nextLocale: LocaleOption) => {
    if (nextLocale === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale, scroll: false });
    });
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const renderCompactLogo = (className: string) => (
    <Image
      src="/logo-small.webp"
      alt="Foliart logo"
      width={201}
      height={200}
      className={className}
    />
  );

  const renderFullLogo = (className: string) => (
    <Image src="/logo5.PNG" alt="Foliart logo" width={135} height={30} className={className} />
  );

  const renderDesktopLocaleSwitcher = () => (
    <div className="relative group z-[100] cursor-pointer">
      <div className="flex flex-row items-center gap-1 p-2 text-[15px] text-white/85 uppercase transition-colors hover:text-white">
        {locale}
        <FiChevronDown size={14} className="mt-0.5" />
      </div>
      <ul className="absolute left-1/2 top-full z-[100] mt-0 min-w-[70px] -translate-x-1/2 rounded-sm border border-gray-100 bg-white opacity-0 shadow-xl invisible transition-all duration-200 group-hover:visible group-hover:opacity-100">
        {localeOptions.map((localeOption, index) => (
          <li
            key={localeOption}
            className={`${index === 0 ? 'border-b border-gray-200' : ''} transition-colors hover:bg-gray-100`}>
            <button
              type="button"
              onClick={() => changeLocale(localeOption)}
              disabled={isPending}
              className={`block w-full cursor-pointer px-4 py-2 text-center text-sm ${
                locale === localeOption ? 'font-bold text-[#074031]' : 'text-gray-700'
              }`}>
              {localeOption.toUpperCase()}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  const renderCompactLocaleSwitcher = () => (
    <div className="flex items-center rounded-sm border border-white/20 p-1">
      {localeOptions.map((localeOption) => {
        const isActive = locale === localeOption;

        return (
          <button
            key={localeOption}
            type="button"
            onClick={() => changeLocale(localeOption)}
            disabled={isPending}
            aria-pressed={isActive}
            className={`rounded-sm px-2 py-1 text-[10px] font-semibold uppercase transition-colors sm:px-3 sm:text-xs ${
              isActive ? 'bg-white text-[#074031]' : 'text-white/75 hover:text-white'
            }`}>
            {localeOption.toUpperCase()}
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      className={`fixed inset-0 z-[150] flex flex-col transition-all duration-500 ${
        isOpen ? 'visible opacity-100' : 'invisible opacity-0'
      }`}
      style={{
        backgroundColor: 'rgba(43, 43, 43, 0.8)',
        backdropFilter: 'blur(12px)',
        boxShadow: 'inset 0 0 40px 0px rgba(255,255,255,0.3)',
      }}>
      <div className="header-top flex flex-shrink-0 items-center justify-between border-b border-white/10 py-4 sm:px-6 md:py-5">
        <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
          <div className="flex items-center gap-4 sm:gap-5 md:gap-6">
            {renderCompactLogo('h-auto w-11 sm:w-12 lg:hidden')}
            {renderFullLogo('hidden h-auto lg:block lg:w-[135px]')}
          </div>

          <div className="lg:hidden">{renderCompactLocaleSwitcher()}</div>
          <div className="hidden lg:block">{renderDesktopLocaleSwitcher()}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-white/60 transition-colors hover:text-white"
          aria-label="Close menu">
          <RxCross1 size={28} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {catalogChildren.length > 0 && (
          <section className="bg-white/[0.06]">
            <div className="header-catalog xl:pt-12 py-6 sm:py-8 md:py-10 lg:py-14 xl:py-20">
              <Link
                href="/catalog"
                onClick={onClose}
                className="block mb-6 text-lg font-light tracking-widest text-white uppercase transition-colors hover:text-white/60">
                {t('catalog')}
              </Link>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {catalogChildren.map((item) => (
                  <Link
                    key={`${item.href}-${item.name}`}
                    href={item.href}
                    onClick={onClose}
                    className="group flex items-center gap-4">
                    <div className="relative h-18 w-18 flex-shrink-0 overflow-hidden rounded-full border border-white/20 bg-white/10 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.95)] md:h-20 md:w-20">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="80px"
                          className="object-cover transition duration-300"
                        />
                      ) : (
                        <div className="h-full w-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.35),rgba(120,154,135,0.95))]" />
                      )}
                    </div>
                    <div className="max-w-[16rem]">
                      <p className="text-lg leading-6 text-white transition-colors group-hover:text-white/85">
                        {item.name}
                      </p>
                      {item.count !== undefined && (
                        <p className="mt-1.5 text-sm text-white/45">
                          {formatProductCount(item.count, locale)}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="border-t border-white/10" />

        <div className="header-links grid grid-cols-1 gap-8 py-8 md:grid-cols-2 lg:gap-10 xl:grid-cols-4">
          <div>
            <Link
              href="/"
              onClick={onClose}
              className="mb-2 block text-lg font-light tracking-widest text-white uppercase transition-colors hover:text-white/60">
              {t('home')}
            </Link>
            <Link
              href="/contacts"
              onClick={onClose}
              className="mt-6 block text-lg font-light tracking-widest text-white uppercase transition-colors hover:text-white/60">
              {t('contacts')}
            </Link>
          </div>

          <div>
            <Link
              href="/about"
              onClick={onClose}
              className="mb-4 block text-lg font-light tracking-widest text-white uppercase transition-colors hover:text-white/60">
              {t('about')}
            </Link>
            <Link
              href="/about/partnery"
              onClick={onClose}
              className="block text-ls text-white/80 transition-colors hover:text-white">
              {t('partners')}
            </Link>
          </div>

          <div>
            <Link
              href="/articles"
              onClick={onClose}
              className="block text-lg font-light tracking-widest text-white uppercase transition-colors hover:text-white/60">
              {t('articles')}
            </Link>
          </div>

          <div>
            <h4 className="mb-4 block text-lg font-light tracking-widest text-white uppercase">
              {t('calendar')}
            </h4>
            {calendarChildren.length > 0 ? (
              <div className="flex flex-col gap-2">
                {calendarChildren.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onClose}
                    className="text-ls text-white/80 transition-colors hover:text-white">
                    {link.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-white/10 px-4 py-5 sm:px-6 md:px-8 md:py-6 xl:px-90">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-10 xl:gap-20">
          <ContactModalTrigger
            onOpen={onClose}
            className="inline-flex w-fit cursor-pointer items-center justify-center rounded-full bg-[#074031] px-7 py-3 text-sm text-white transition-colors hover:bg-[#074031]/80">
            {footerT('callOrder')}
          </ContactModalTrigger>
          <div>
            <p className="text-xs text-white/30">{footerT('slogan')}</p>
            <Link
              href="/privacy"
              onClick={onClose}
              className="text-xs text-white/40 underline underline-offset-2 transition-colors hover:text-white/70">
              {footerT('privacy')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
