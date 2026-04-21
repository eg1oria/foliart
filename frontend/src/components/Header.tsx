'use client';

import Image from 'next/image';
import { useState, useEffect, useTransition } from 'react';
import { BsTelephoneInbound } from 'react-icons/bs';
import { RxHamburgerMenu } from 'react-icons/rx';
import { FiChevronDown } from 'react-icons/fi';
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
      children: [{ name: t('partners'), href: '/about/partnery' }],
    },
    {
      name: t('articles'),
      href: '/articles',
    },
    {
      name: t('calendar'),
      href: '/calendar',
      children: [
        {
          name: t('wheat'),
          href: '/wheat',
        },
        {
          name: t('corn'),
          href: '/corn',
        },
        {
          name: t('beet'),
          href: '/beet',
        },
        {
          name: t('soybeans'),
          href: '/soybeans',
        },
        {
          name: t('sunflower'),
          href: '/sunflower',
        },
      ],
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
            src={'/logo5.PNG'}
            alt="Logo"
            width={135}
            height={30}
            className="w-[135px] h-auto"
          />
          <div className="flex items-center gap-9">
            <button
              onClick={toggleLocale}
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
                className={`relative group border-b-4 border-transparent -mb-1 ${typeof item.name === 'string' ? 'hover:border-[#074031]' : ''}  transition-colors`}>
                {item.href === '#' ? (
                  <button
                    onClick={(e) => e.preventDefault()}
                    className="text-white text-sm hover:text-white/80 transition-colors flex items-center cursor-pointer bg-transparent border-0 p-0">
                    {item.name}
                  </button>
                ) : (
                  <>
                    <Link
                      href={item.href}
                      className={`inline-flex items-center gap-1 text-white text-sm hover:text-white/80 transition-colors p-4 ${item.children ? 'hover:bg-[#074031]' : ''}`}>
                      {typeof item.name === 'string' ? item.name.toUpperCase() : item.name}
                      {'children' in item && item.children && (
                        <FiChevronDown size={14} className="mt-0.5" />
                      )}
                    </Link>
                    {'children' in item && item.children && (
                      <ul className="absolute left-0 top-full bg-white shadow-md min-w-[180px] invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 z-50">
                        {item.children.map((child, childIdx) => (
                          <li
                            key={childIdx}
                            className="border border-b-gray-200 border-b-1 hover:border-b-gray-900">
                            <Link
                              href={child.href}
                              className="block px-4 py-4 text-gray-700 hover:bg-gray-200 text-ls transition-colors">
                              {child.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
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
            src={'/logo5.PNG'}
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
