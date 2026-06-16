import { Link } from '@/i18n/routing';
import { withContentLocale } from '@/lib/contentLocales';
import type { IconType } from 'react-icons';
import { FiBookOpen, FiBox, FiCalendar } from 'react-icons/fi';

import { adminCx } from './adminStyles';

// FIX 1: i18n вынесен из массива — нет дублирования locale === 'en' ? ... : ...
// FIX 2: Unicode escape-последовательности заменены на читаемый текст
const tabsI18n: Record<
  string,
  Record<'products' | 'articles' | 'calendars', { label: string; description: string }>
> = {
  en: {
    products: {
      label: 'Products',
      description: 'Catalog items and category translations',
    },
    articles: {
      label: 'Articles',
      description: 'Cards, dates, and rich text content',
    },
    calendars: {
      label: 'Calendar',
      description: 'Crop pages and image slots',
    },
  },
  ru: {
    products: {
      label: 'Товары',
      description: 'Каталог и переводы категорий',
    },
    articles: {
      label: 'Статьи',
      description: 'Карточки, даты и форматируемый текст',
    },
    calendars: {
      label: 'Календарь',
      description: 'Страницы культур и фотослоты',
    },
  },
};

const TAB_ITEMS: Array<{
  href: '/admin/products' | '/admin/articles' | '/admin/calendars';
  icon: IconType;
  key: 'products' | 'articles' | 'calendars';
}> = [
  { key: 'products', href: '/admin/products', icon: FiBox },
  { key: 'articles', href: '/admin/articles', icon: FiBookOpen },
  { key: 'calendars', href: '/admin/calendars', icon: FiCalendar },
];

export default function AdminTabs({
  active,
  contentLocale,
  locale,
}: {
  active: 'products' | 'articles' | 'calendars';
  contentLocale: string;
  locale: string;
}) {
  const strings = tabsI18n[locale] ?? tabsI18n['en'];

  return (
    // FIX 3: aria-label на <nav> — несколько nav на странице должны различаться для скринридеров
    <nav
      aria-label={locale === 'en' ? 'Admin sections' : 'Разделы администратора'}
      className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1 [&::-webkit-scrollbar]:hidden">
      {TAB_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = item.key === active;
        const { label, description } = strings[item.key];

        return (
          <Link
            key={item.key}
            href={withContentLocale(item.href, contentLocale)}
            // FIX 4: aria-current="page" на активном элементе — стандарт WAI-ARIA для навигации
            aria-current={isActive ? 'page' : undefined}
            // FIX 5: description теперь используется как title — виден при hover и доступен скринридерам
            title={description}
            className={adminCx(
              'flex min-h-10 shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition',
              isActive
                ? 'border-[#0b5a45] bg-[#0b5a45] text-white shadow-[0_8px_20px_-14px_rgba(11,62,49,0.8)]'
                : 'border-[#0b5a45]/12 bg-[#f7f9f6] text-[#0b3e31] hover:border-[#0b5a45]/25 hover:bg-[#eef4ef]',
            )}>
            <span
              aria-hidden="true"
              className={adminCx(
                'inline-flex h-5 w-5 shrink-0 items-center justify-center',
                isActive ? 'text-white' : 'text-[#0b5a45]',
              )}>
              <Icon />
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
