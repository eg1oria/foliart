import type { AdminSection, AdminSessionUser } from '@/lib/adminPermissions';
import { canViewSection, isAdminScreenHidden } from '@/lib/adminPermissions';
import type { IconType } from 'react-icons';
import {
  FiBookOpen,
  FiBox,
  FiBriefcase,
  FiCalendar,
  FiDatabase,
  FiFolder,
  FiGlobe,
  FiImage,
  FiLayout,
  FiMapPin,
  FiShare2,
  FiUser,
  FiUsers,
} from 'react-icons/fi';

export type AdminTabKey =
  | AdminSection
  | 'admins'
  | 'account'
  | 'backups'
  | 'productCategories';

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
    contacts: {
      label: 'Contacts',
      description: 'Regional representatives on the contacts page',
    },
    'site-images': {
      label: 'Site images',
      description: 'Photos across the public site',
    },
    'social-links': {
      label: 'Social links',
      description: 'Network badges in the header, per language',
    },
    'site-pages': {
      label: 'Pages',
      description: 'Landing pages built from your own HTML',
    },
    messages: {
      label: 'Translations',
      description: 'Public interface messages',
    },
    admins: {
      label: 'Admins',
      description: 'Accounts and section access',
    },
    backups: {
      label: 'Backups',
      description: 'Create, download and restore site backups',
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
    contacts: {
      label: 'Контакты',
      description: 'Представители в регионах на странице контактов',
    },
    'site-images': {
      label: 'Изображения сайта',
      description: 'Фотографии на страницах публичного сайта',
    },
    'social-links': {
      label: 'Соцсети в шапке',
      description: 'Кнопки соцсетей в шапке сайта — отдельно для каждого языка',
    },
    'site-pages': {
      label: 'Страницы',
      description: 'Новые страницы сайта из собственного HTML',
    },
    messages: {
      label: 'Переводы',
      description: 'Интерфейсные тексты публичного сайта',
    },
    admins: {
      label: 'Администраторы',
      description: 'Учётные записи и доступ к разделам',
    },
    backups: {
      label: 'Резервные копии',
      description: 'Создание, скачивание и восстановление копий сайта',
    },
    account: {
      label: 'Мой профиль',
      description: 'Смена собственного пароля',
    },
  },
};

// Content sections plus the super-admin-only accounts and backups screens.
export const adminNavItems: AdminNavItem[] = [
  { key: 'products', href: '/admin/products', icon: FiBox },
  { key: 'productCategories', href: '/admin/products/categories', icon: FiFolder },
  { key: 'articles', href: '/admin/articles', icon: FiBookOpen },
  { key: 'calendars', href: '/admin/calendars', icon: FiCalendar },
  { key: 'partners', href: '/admin/partners', icon: FiBriefcase },
  { key: 'contacts', href: '/admin/contacts', icon: FiMapPin },
  { key: 'site-images', href: '/admin/site-images', icon: FiImage },
  { key: 'social-links', href: '/admin/social-links', icon: FiShare2 },
  { key: 'site-pages', href: '/admin/site-pages', icon: FiLayout },
  { key: 'messages', href: '/admin/messages', icon: FiGlobe },
  { key: 'admins', href: '/admin/admins', icon: FiUsers },
  { key: 'backups', href: '/admin/backups', icon: FiDatabase },
];

export const adminAccountNavItem: AdminNavItem = {
  key: 'account',
  href: '/admin/account',
  icon: FiUser,
};

export function getAdminNavStrings(locale: string) {
  return navI18n[locale] ?? navI18n['en'];
}

// The admins and backups tabs belong to the super admin only — a backup holds
// the whole database, password hashes included. Every content tab follows the
// per-section permissions of whoever is signed in.
export function isAdminTabVisible(key: AdminTabKey, session: AdminSessionUser) {
  if (isAdminScreenHidden(key)) {
    return false;
  }

  if (key === 'admins' || key === 'backups') {
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
