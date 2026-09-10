import type { AdminSection, AdminSessionUser } from '@/lib/adminPermissions';
import { canViewSection } from '@/lib/adminPermissions';
import type { IconType } from 'react-icons';
import {
  FiAward,
  FiBookOpen,
  FiBox,
  FiBriefcase,
  FiCalendar,
  FiFolder,
  FiGlobe,
  FiMapPin,
  FiUser,
  FiUsers,
} from 'react-icons/fi';

export type AdminTabKey = AdminSection | 'admins' | 'account' | 'productCategories';

export type AdminNavItem = {
  href: string;
  icon: IconType;
  key: AdminTabKey;
};

type AdminNavStrings = {
  description: string;
  label: string;
};

const navI18n: Record<string, Record<AdminTabKey, AdminNavStrings>> = {
  en: {
    products: {
      label: 'Products',
      description: 'Catalog items',
    },
    productCategories: {
      label: 'Categories',
      description: 'Add, remove, and translate catalog categories',
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
    certificates: {
      label: 'Certificate',
      description: 'Certificate of conformity linked from product pages',
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
      description: 'Каталог товаров',
    },
    productCategories: {
      label: 'Категории',
      description: 'Добавление, удаление и переводы категорий',
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
    certificates: {
      label: 'Сертификат',
      description: 'Сертификат соответствия со страниц товаров',
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

// Content sections plus the super-admin-only accounts screen.
export const adminNavItems: AdminNavItem[] = [
  { key: 'products', href: '/admin/products', icon: FiBox },
  { key: 'productCategories', href: '/admin/products/categories', icon: FiFolder },
  { key: 'articles', href: '/admin/articles', icon: FiBookOpen },
  { key: 'calendars', href: '/admin/calendars', icon: FiCalendar },
  { key: 'partners', href: '/admin/partners', icon: FiBriefcase },
  { key: 'certificates', href: '/admin/certificates', icon: FiAward },
  { key: 'contacts', href: '/admin/contacts', icon: FiMapPin },
  { key: 'messages', href: '/admin/messages', icon: FiGlobe },
  { key: 'admins', href: '/admin/admins', icon: FiUsers },
];

export const adminAccountNavItem: AdminNavItem = {
  key: 'account',
  href: '/admin/account',
  icon: FiUser,
};

export function getAdminNavStrings(locale: string) {
  return navI18n[locale] ?? navI18n['en'];
}

// The admins tab belongs to the super admin only; every content tab follows the
// per-section permissions of whoever is signed in.
export function isAdminTabVisible(key: AdminTabKey, session: AdminSessionUser) {
  if (key === 'admins') {
    return session.isSuperAdmin;
  }

  if (key === 'account') {
    return true;
  }

  if (key === 'productCategories') {
    return canViewSection(session, 'products');
  }

  return canViewSection(session, key);
}

export function getVisibleAdminNavItems(session: AdminSessionUser) {
  return adminNavItems.filter((item) => isAdminTabVisible(item.key, session));
}

// Longest match wins so `/admin/products/categories` does not resolve to the
// products tab, and detail routes light up the section they belong to.
export function getActiveAdminTab(pathname: string): AdminTabKey | null {
  const candidates = [...adminNavItems, adminAccountNavItem].sort(
    (a, b) => b.href.length - a.href.length,
  );

  const match = candidates.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return match?.key ?? null;
}
