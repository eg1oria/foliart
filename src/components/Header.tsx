'use client';

import Image from 'next/image';
import { useState, useEffect, useTransition } from 'react';
import { BsTelephoneInbound } from 'react-icons/bs';
import { RxHamburgerMenu } from 'react-icons/rx';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { useTranslations, useLocale } from 'next-intl';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const t = useTranslations('Header');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const toggleLocale = () => {
    const nextLocale = locale === 'ru' ? 'en' : 'ru';
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale, scroll: false });
    });
  };

  const navItems = [
    {
      name: <RxHamburgerMenu size={26} color="white" />,
      href: '#',
    },
    {
      name: t('home'),
      href: '/',
    },
    {
      name: t('catalog'),
      href: '/catalog',
    },
    {
      name: t('about'),
      href: '/about',
    },
    {
      name: t('articles'),
      href: '/articles',
    },
    {
      name: t('calendar'),
      href: '/calendar',
    },
    {
      name: t('contacts'),
      href: '/contacts',
    },
  ];

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    handleScroll();

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header
        className="px-90 py-6 gap-12 flex flex-col absolute top-0 left-0 w-full z-50 pb-0"
        style={{ backgroundColor: 'rgba(7,64,49, 0.1)' }}>
        <div className="flex justify-between items-center">
          <Image
            src={'/logo.png'}
            alt="Logo"
            width={135}
            height={30}
            className="w-[135px] h-auto"
          />
          <div className="flex items-center gap-9">
            <button
              onClick={toggleLocale}
              disabled={isPending}
              className="text-ls text-white/85 hover:text-white transition-colors uppercase cursor-pointer">
              {locale === 'ru' ? 'EN' : 'RU'}
            </button>

            <div
              className="p-3 rounded-full text-white cursor-pointer hover:bg-[#074031]/80 transition-colors"
              style={{ backgroundColor: '#074031' }}>
              <BsTelephoneInbound size={22} />
            </div>
          </div>
        </div>

        <nav className="border-b-3  border-white/20 px-5">
          <ul className="flex space-x-6 justify-between mt-4 md:mt-0 hidden md:flex">
            {navItems.map((item, idx) => (
              <li
                key={idx}
                className={`border-b-4 border-transparent -mb-1 ${typeof item.name === 'string' ? 'hover:border-[#074031]' : ''} pb-3 transition-colors`}>
                {item.href === '#' ? (
                  <button
                    onClick={(e) => e.preventDefault()}
                    className="text-white text-sm hover:text-white/80 transition-colors flex items-center cursor-pointer bg-transparent border-0 p-0">
                    {item.name}
                  </button>
                ) : (
                  <Link
                    href={'#'}
                    className="text-white text-sm hover:text-white/80 transition-colors">
                    {typeof item.name === 'string' ? item.name.toUpperCase() : item.name}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <div
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 px-90 py-2 flex justify-between items-center ${
          isScrolled ? 'translate-y-0 opacity-100 visible' : '-translate-y-full opacity-0 invisible'
        }`}
        style={{
          backgroundColor: '#4d4d4de7',
        }}>
        <div className="flex justify-between items-center gap-9">
          <div
            className="p-3 rounded-full text-white cursor-pointer hover:bg-[#074031]/80 transition-colors"
            style={{ backgroundColor: '#074031' }}>
            <RxHamburgerMenu size={22} />
          </div>

          <Image
            src={'/logo.png'}
            alt="Logo"
            width={110}
            height={30}
            className="w-[110px] h-auto"
          />
        </div>
        <div className="flex items-center gap-9">
          <button
            onClick={toggleLocale}
            disabled={isPending}
            className="text-ls text-white/85 hover:text-white transition-colors uppercase cursor-pointer">
            {locale === 'ru' ? 'EN' : 'RU'}
          </button>
          <div
            className="p-3 rounded-full text-white cursor-pointer hover:bg-[#074031]/80 transition-colors"
            style={{ backgroundColor: '#074031' }}>
            <BsTelephoneInbound size={22} />
          </div>
        </div>
      </div>
    </>
  );
}
