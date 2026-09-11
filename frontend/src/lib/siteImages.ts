/** One replaced slot as the backend reports it. */
export type SiteImageRecord = {
  imageUrl: string;
  width: number;
  height: number;
  revision: number;
  updatedAt: string;
};

/** Whole set keyed by slot; a missing key means the slot is still on its default. */
export type SiteImageMap = Partial<Record<string, SiteImageRecord>>;

export type SiteImageGroup =
  | 'home'
  | 'about'
  | 'catalog'
  | 'articles'
  | 'calendar'
  | 'partners'
  | 'contacts'
  | 'privacy'
  | 'common';

export type SiteImageSlot = {
  /** File in `public/` the slot renders until an admin replaces it. */
  default: string;
  group: SiteImageGroup;
  label: string;
  hint: string;
  /** CSS ratio, so the admin preview matches the shape the site renders. */
  aspect: string;
  recommended: string;
  /** Longest edge the upload is resized to; sent to the backend on upload. */
  maxDimension: number;
};

/**
 * Slots are logical places, not files. Several places share a default file
 * today — the articles and calendar headers are both `/articles-head.webp` —
 * and giving them one key would mean replacing one silently replaces the other.
 * Separate keys let them diverge later without surprising anyone.
 */
export const siteImageSlots = {
  'home-hero': {
    default: '/hero.webp',
    group: 'home',
    label: 'Главный баннер',
    hint: 'Фон первого экрана главной страницы',
    aspect: '16/9',
    recommended: '1920×1080',
    maxDimension: 1920,
  },
  'home-icon-1': {
    default: '/hero-icon1.webp',
    group: 'home',
    label: 'Иконка 1 на баннере',
    hint: 'Первый пункт списка под логотипом на главной',
    aspect: '1/1',
    recommended: '180×180',
    maxDimension: 360,
  },
  'home-icon-2': {
    default: '/hero-icon2.webp',
    group: 'home',
    label: 'Иконка 2 на баннере',
    hint: 'Второй пункт списка под логотипом на главной',
    aspect: '1/1',
    recommended: '180×180',
    maxDimension: 360,
  },
  'home-icon-3': {
    default: '/hero-icon3.webp',
    group: 'home',
    label: 'Иконка 3 на баннере',
    hint: 'Третий пункт списка под логотипом на главной',
    aspect: '1/1',
    recommended: '180×180',
    maxDimension: 360,
  },
  'home-icon-4': {
    default: '/hero-icon4.webp',
    group: 'home',
    label: 'Иконка 4 на баннере',
    hint: 'Четвёртый пункт списка под логотипом на главной',
    aspect: '1/1',
    recommended: '180×180',
    maxDimension: 360,
  },
  'home-complex-bg': {
    default: '/complex.webp',
    group: 'home',
    label: 'Фон блока «Комплексы»',
    hint: 'Полупрозрачная подложка блока о комплексах на главной',
    aspect: '16/9',
    recommended: '1600×900',
    maxDimension: 1600,
  },
  'home-complex-photo': {
    default: '/complex1.webp',
    group: 'home',
    label: 'Фото в блоке «Комплексы»',
    hint: 'Снимок слева от текста о комплексах на главной',
    aspect: '3/2',
    recommended: '900×600',
    maxDimension: 1200,
  },
  'home-advantage-1': {
    default: '/advantage1.webp',
    group: 'home',
    label: 'Преимущество 1',
    hint: 'Первый блок раздела «Преимущества» на главной',
    aspect: '430/240',
    recommended: '860×480',
    maxDimension: 1000,
  },
  'home-advantage-2': {
    default: '/advantage2.webp',
    group: 'home',
    label: 'Преимущество 2',
    hint: 'Второй блок раздела «Преимущества» на главной',
    aspect: '500/167',
    recommended: '1000×334',
    maxDimension: 1000,
  },
  'home-advantage-3': {
    default: '/advantage3.webp',
    group: 'home',
    label: 'Преимущество 3',
    hint: 'Третий блок раздела «Преимущества» на главной',
    aspect: '360/361',
    recommended: '720×722',
    maxDimension: 1000,
  },
  'home-advantage-4': {
    default: '/advantage4.webp',
    group: 'home',
    label: 'Преимущество 4',
    hint: 'Четвёртый блок раздела «Преимущества» на главной',
    aspect: '300/500',
    recommended: '600×1000',
    maxDimension: 1000,
  },
  'home-advantage-5': {
    default: '/advantage5.webp',
    group: 'home',
    label: 'Преимущество 5',
    hint: 'Пятый блок раздела «Преимущества» на главной',
    aspect: '500/333',
    recommended: '1000×666',
    maxDimension: 1000,
  },
  'about-hero': {
    default: '/about-head1.webp',
    group: 'about',
    label: 'Шапка «О компании»',
    hint: 'Фон первого экрана страницы «О компании»',
    aspect: '16/9',
    recommended: '1920×1080',
    maxDimension: 1920,
  },
  'about-form-bg': {
    default: '/about-form.webp',
    group: 'about',
    label: 'Фон формы «О компании»',
    hint: 'Подложка блока обратной связи внизу страницы «О компании»',
    aspect: '16/9',
    recommended: '1600×900',
    maxDimension: 1600,
  },
  'catalog-hero': {
    default: '/catalog-head.webp',
    group: 'catalog',
    label: 'Шапка каталога',
    hint: 'Фон первого экрана каталога, категорий и карточек товаров',
    aspect: '16/9',
    recommended: '1920×1080',
    maxDimension: 1920,
  },
  'catalog-specialist': {
    default: '/specialist.webp',
    group: 'catalog',
    label: 'Фото специалиста',
    hint: 'Круглый портрет в блоке консультации на карточке товара',
    aspect: '1/1',
    recommended: '600×600',
    maxDimension: 800,
  },
  'catalog-certificate-fallback': {
    default: '/sertificate.webp',
    group: 'catalog',
    label: 'Сертификат по умолчанию',
    hint: 'Показывается в карточке товара, пока в разделе «Сертификат» ничего не загружено',
    aspect: '3/4',
    recommended: '1200×1600',
    maxDimension: 1600,
  },
  'search-hero': {
    default: '/catalog-head.webp',
    group: 'catalog',
    label: 'Шапка поиска',
    hint: 'Фон первого экрана страницы результатов поиска',
    aspect: '16/9',
    recommended: '1920×1080',
    maxDimension: 1920,
  },
  'articles-hero': {
    default: '/articles-head.webp',
    group: 'articles',
    label: 'Шапка статей',
    hint: 'Фон первого экрана списка статей и отдельной статьи',
    aspect: '16/9',
    recommended: '1920×1080',
    maxDimension: 1920,
  },
  'calendar-hero': {
    default: '/articles-head.webp',
    group: 'calendar',
    label: 'Шапка календаря',
    hint: 'Фон первого экрана календаря и страниц культур',
    aspect: '16/9',
    recommended: '1920×1080',
    maxDimension: 1920,
  },
  'partners-hero': {
    default: '/partners-head.webp',
    group: 'partners',
    label: 'Шапка партнёров',
    hint: 'Фон первого экрана страницы «Партнёры»',
    aspect: '16/9',
    recommended: '1920×1080',
    maxDimension: 1920,
  },
  'contacts-hero': {
    default: '/contacts.webp',
    group: 'contacts',
    label: 'Шапка контактов',
    hint: 'Фон первого экрана страницы контактов',
    aspect: '16/9',
    recommended: '1920×1080',
    maxDimension: 1920,
  },
  'contacts-form-bg': {
    default: '/about-head1.webp',
    group: 'contacts',
    label: 'Фон формы на контактах',
    hint: 'Подложка блока обратной связи внизу страницы контактов',
    aspect: '16/9',
    recommended: '1600×900',
    maxDimension: 1600,
  },
  'privacy-hero': {
    default: '/about-head1.webp',
    group: 'privacy',
    label: 'Шапка политики',
    hint: 'Фон первого экрана политики конфиденциальности',
    aspect: '16/9',
    recommended: '1920×1080',
    maxDimension: 1920,
  },
  'footer-bg': {
    default: '/footer3.webp',
    group: 'common',
    label: 'Фон подвала',
    hint: 'Подложка нижнего блока на всех страницах',
    aspect: '16/9',
    recommended: '1920×1080',
    maxDimension: 1920,
  },
  'contact-modal': {
    default: '/question.webp',
    group: 'common',
    label: 'Фото в окне «Задать вопрос»',
    hint: 'Иллюстрация слева во всплывающем окне вопроса',
    aspect: '470/622',
    recommended: '940×1244',
    maxDimension: 1244,
  },
} as const satisfies Record<string, SiteImageSlot>;

export type SiteImageKey = keyof typeof siteImageSlots;

export const siteImageKeys = Object.keys(siteImageSlots) as SiteImageKey[];

export const siteImageGroupLabels: Record<SiteImageGroup, string> = {
  home: 'Главная',
  about: 'О компании',
  catalog: 'Каталог',
  articles: 'Статьи',
  calendar: 'Календарь',
  partners: 'Партнёры',
  contacts: 'Контакты',
  privacy: 'Политика',
  common: 'Общие',
};

/** Order the admin tab shows its group switcher in. */
export const siteImageGroups = Object.keys(siteImageGroupLabels) as SiteImageGroup[];

/** Public page each group's slots are visible on, for the "open on site" link. */
export const siteImageGroupPaths: Record<SiteImageGroup, string> = {
  home: '/',
  about: '/about',
  catalog: '/catalog',
  articles: '/articles',
  calendar: '/calendar',
  partners: '/about/partnery',
  contacts: '/contacts',
  privacy: '/privacy',
  common: '/',
};

export function isSiteImageKey(value: unknown): value is SiteImageKey {
  return typeof value === 'string' && value in siteImageSlots;
}
