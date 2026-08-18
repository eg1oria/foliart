import { Link } from '@/i18n/routing';
import type { AdminSection, AdminSessionUser } from '@/lib/adminPermissions';
import { canViewSection } from '@/lib/adminPermissions';
import { withContentLocale } from '@/lib/contentLocales';
import type { IconType } from 'react-icons';
import {
  FiBookOpen,
  FiBox,
  FiBriefcase,
  FiCalendar,
  FiMapPin,
  FiUsers,
} from 'react-icons/fi';

import { adminCx } from './adminStyles';

export type AdminTabKey = AdminSection | 'admins' | 'account';

// FIX 1: i18n вынесен из массива — нет дублирования locale === 'en' ? ... : ...
// FIX 2: Unicode escape-последовательности заменены на читаемый текст
const tabsI18n: Record<
  string,
  Record<AdminTabKey, { label: string; description: string }>
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
    partners: {
      label: 'Partners',
      description: 'Partner cards on the about page',
    },
    contacts: {
      label: 'Contacts',
      description: 'Regional representatives on the contacts page',
    },
    messages: {
      label: 'Translations',
      description: 'Public interface messages',
    },
    admins: {
      label: 'Admins',
      description: 'Accounts and section access',
    },
    account: {
      label: 'My profile',
      description: 'Your own password',
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
    partners: {
      label: 'Партнёры',
      description: 'Карточки партнёров на странице «О компании»',
    },
    contacts: {
      label: 'Контакты',
      description: 'Представители в регионах на странице контактов',
    },
    messages: {
      label: 'Переводы',
      description: 'Интерфейсные тексты публичного сайта',
    },
    admins: {
      label: 'Администраторы',
      description: 'Учётные записи и доступ к разделам',
    },
    account: {
      label: 'Мой профиль',
      description: 'Смена собственного пароля',
    },
  },
};

const TAB_ITEMS: Array<{
  href:
    | '/admin/products'
    | '/admin/articles'
    | '/admin/calendars'
    | '/admin/partners'
    | '/admin/contacts'
    | '/admin/admins';
  // | '/admin/messages';
  icon: IconType;
  key: AdminTabKey;
}> = [
  { key: 'products', href: '/admin/products', icon: FiBox },
  { key: 'articles', href: '/admin/articles', icon: FiBookOpen },
  { key: 'calendars', href: '/admin/calendars', icon: FiCalendar },
  { key: 'partners', href: '/admin/partners', icon: FiBriefcase },
  { key: 'contacts', href: '/admin/contacts', icon: FiMapPin },
  // { key: 'messages', href: '/admin/messages', icon: FiGlobe },
  { key: 'admins', href: '/admin/admins', icon: FiUsers },
];

// The admins tab belongs to the super admin only; every content tab follows the
// per-section permissions of whoever is signed in.
function isTabVisible(key: AdminTabKey, session: AdminSessionUser) {
  if (key === 'admins') {
    return session.isSuperAdmin;
  }

  if (key === 'account') {
    return true;
  }

  return canViewSection(session, key);
}

export default function AdminTabs({
  active,
  contentLocale,
  locale,
  session,
}: {
  active: AdminTabKey;
  contentLocale: string;
  locale: string;
  session: AdminSessionUser;
}) {
  const strings = tabsI18n[locale] ?? tabsI18n['en'];
  const items = TAB_ITEMS.filter((item) => isTabVisible(item.key, session));

  if (!items.length) {
    return null;
  }

  return (
    // FIX 3: aria-label на <nav> — несколько nav на странице должны различаться для скринридеров
    <nav
      aria-label={locale === 'en' ? 'Admin sections' : 'Разделы администратора'}
      className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1 [&::-webkit-scrollbar]:hidden">
      {items.map((item) => {
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
