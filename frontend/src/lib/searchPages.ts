import type { SearchDocument } from './search';

type StaticPageCopy = {
  path: string;
  title: string;
  description: string;
  keywords: string[];
};

const ruPages: StaticPageCopy[] = [
  {
    path: '/',
    title: 'Главная',
    description:
      'Фолиарт — российский производитель органо-минеральных комплексов и систем питания растений.',
    keywords: ['фолиарт', 'foliart', 'главная', 'удобрения', 'органо-минеральные комплексы'],
  },
  {
    path: '/catalog',
    title: 'Каталог удобрений',
    description:
      'Все продукты Фолиарт: фитомодуляторы, монопродукты, комплексные препараты и вспомогательные компоненты.',
    keywords: ['каталог', 'продукция', 'удобрения', 'препараты', 'подкормки'],
  },
  {
    path: '/about',
    title: 'О компании',
    description:
      'История, научная база и производство органо-минеральных комплексов Фолиарт.',
    keywords: ['о компании', 'производитель', 'астория', 'производство', 'наука'],
  },
  {
    path: '/about/partnery',
    title: 'Партнеры',
    description: 'Дистрибьюторы и партнеры Фолиарт в России и за рубежом.',
    keywords: ['партнеры', 'дистрибьюторы', 'дилеры', 'сотрудничество'],
  },
  {
    path: '/articles',
    title: 'Полезные статьи',
    description:
      'Материалы о питании растений, восстановлении после стресса и системах удобрения.',
    keywords: ['статьи', 'блог', 'публикации', 'агрономия', 'советы'],
  },
  {
    path: '/calendar',
    title: 'Календарь работ',
    description:
      'Календари обработок по культурам: сроки, схемы применения и нормы расхода.',
    keywords: ['календарь', 'схемы обработок', 'сроки', 'культуры', 'регламент'],
  },
  {
    path: '/contacts',
    title: 'Контакты',
    description: 'Телефон, e-mail и адрес центрального офиса в Краснодаре, форма обратной связи.',
    keywords: ['контакты', 'телефон', 'почта', 'адрес', 'обратная связь', 'краснодар'],
  },
  {
    path: '/privacy',
    title: 'Политика обработки персональных данных',
    description: 'Порядок обработки и защиты персональных данных посетителей сайта.',
    keywords: ['политика', 'персональные данные', 'конфиденциальность', 'согласие'],
  },
];

const enPages: StaticPageCopy[] = [
  {
    path: '/',
    title: 'Home',
    description:
      'Foliart is a Russian producer of organo-mineral complexes and plant nutrition systems.',
    keywords: ['foliart', 'home', 'fertilizers', 'organo-mineral complexes'],
  },
  {
    path: '/catalog',
    title: 'Fertilizers Catalog',
    description:
      'All Foliart products: phytomodulators, single products, complex preparations and auxiliary components.',
    keywords: ['catalog', 'products', 'fertilizers', 'preparations', 'foliar feeding'],
  },
  {
    path: '/about',
    title: 'About Us',
    description: 'History, research base and production of Foliart organo-mineral complexes.',
    keywords: ['about', 'company', 'manufacturer', 'production', 'research'],
  },
  {
    path: '/about/partnery',
    title: 'Partners',
    description: 'Foliart distributors and partners in Russia and abroad.',
    keywords: ['partners', 'distributors', 'dealers', 'cooperation'],
  },
  {
    path: '/articles',
    title: 'Useful Articles',
    description: 'Articles on plant nutrition, stress recovery and fertilization systems.',
    keywords: ['articles', 'blog', 'publications', 'agronomy', 'tips'],
  },
  {
    path: '/calendar',
    title: 'Calendar',
    description: 'Treatment calendars by crop: timing, application schemes and rates.',
    keywords: ['calendar', 'treatment schemes', 'timing', 'crops'],
  },
  {
    path: '/contacts',
    title: 'Contacts',
    description: 'Phone, e-mail and head office address in Krasnodar, feedback form.',
    keywords: ['contacts', 'phone', 'email', 'address', 'feedback', 'krasnodar'],
  },
  {
    path: '/privacy',
    title: 'Personal Data Processing Policy',
    description: 'How personal data of website visitors is processed and protected.',
    keywords: ['policy', 'personal data', 'privacy', 'consent'],
  },
];

const frPages: StaticPageCopy[] = [
  {
    path: '/',
    title: 'Accueil',
    description:
      'Foliart, producteur russe de complexes organo-minéraux et de systèmes de nutrition des plantes.',
    keywords: ['foliart', 'accueil', 'engrais', 'complexes organo-minéraux'],
  },
  {
    path: '/catalog',
    title: "Catalogue d'engrais",
    description:
      'Tous les produits Foliart : phytomodulateurs, monoproduits, préparations complexes et composants auxiliaires.',
    keywords: ['catalogue', 'produits', 'engrais', 'préparations'],
  },
  {
    path: '/about',
    title: 'À propos de nous',
    description:
      'Histoire, base scientifique et production des complexes organo-minéraux Foliart.',
    keywords: ['à propos', 'société', 'fabricant', 'production', 'science'],
  },
  {
    path: '/about/partnery',
    title: 'Partenaires',
    description: 'Distributeurs et partenaires de Foliart en Russie et à l’étranger.',
    keywords: ['partenaires', 'distributeurs', 'coopération'],
  },
  {
    path: '/articles',
    title: 'Articles utiles',
    description:
      'Articles sur la nutrition des plantes, la récupération après le stress et les systèmes de fertilisation.',
    keywords: ['articles', 'blog', 'publications', 'agronomie', 'conseils'],
  },
  {
    path: '/calendar',
    title: 'Calendrier',
    description:
      'Calendriers de traitement par culture : périodes, schémas d’application et doses.',
    keywords: ['calendrier', 'schémas de traitement', 'périodes', 'cultures'],
  },
  {
    path: '/contacts',
    title: 'Contacts',
    description:
      'Téléphone, e-mail et adresse du siège à Krasnodar, formulaire de contact.',
    keywords: ['contacts', 'téléphone', 'email', 'adresse', 'krasnodar'],
  },
  {
    path: '/privacy',
    title: 'Politique de traitement des données personnelles',
    description:
      'Traitement et protection des données personnelles des visiteurs du site.',
    keywords: ['politique', 'données personnelles', 'confidentialité', 'consentement'],
  },
];

const esPages: StaticPageCopy[] = [
  {
    path: '/',
    title: 'Inicio',
    description:
      'Foliart es un productor ruso de complejos organominerales y sistemas de nutrición vegetal.',
    keywords: ['foliart', 'inicio', 'fertilizantes', 'complejos organominerales'],
  },
  {
    path: '/catalog',
    title: 'Catálogo de fertilizantes',
    description:
      'Todos los productos Foliart: fitomoduladores, monoproductos, preparados complejos y componentes auxiliares.',
    keywords: ['catálogo', 'productos', 'fertilizantes', 'preparados'],
  },
  {
    path: '/about',
    title: 'Sobre nosotros',
    description:
      'Historia, base científica y producción de los complejos organominerales Foliart.',
    keywords: ['sobre nosotros', 'empresa', 'fabricante', 'producción', 'ciencia'],
  },
  {
    path: '/about/partnery',
    title: 'Socios',
    description: 'Distribuidores y socios de Foliart en Rusia y en el extranjero.',
    keywords: ['socios', 'distribuidores', 'cooperación'],
  },
  {
    path: '/articles',
    title: 'Artículos útiles',
    description:
      'Artículos sobre nutrición vegetal, recuperación tras el estrés y sistemas de fertilización.',
    keywords: ['artículos', 'blog', 'publicaciones', 'agronomía', 'consejos'],
  },
  {
    path: '/calendar',
    title: 'Calendario',
    description:
      'Calendarios de tratamiento por cultivo: fechas, esquemas de aplicación y dosis.',
    keywords: ['calendario', 'esquemas de tratamiento', 'fechas', 'cultivos'],
  },
  {
    path: '/contacts',
    title: 'Contactos',
    description:
      'Teléfono, correo electrónico y dirección de la oficina central en Krasnodar, formulario de contacto.',
    keywords: ['contactos', 'teléfono', 'correo', 'dirección', 'krasnodar'],
  },
  {
    path: '/privacy',
    title: 'Política de tratamiento de datos personales',
    description:
      'Tratamiento y protección de los datos personales de los visitantes del sitio.',
    keywords: ['política', 'datos personales', 'privacidad', 'consentimiento'],
  },
];

const pagesByLocale: Record<string, StaticPageCopy[]> = {
  ru: ruPages,
  en: enPages,
  fr: frPages,
  es: esPages,
};

/** Static site pages that are part of the search index but have no API record. */
export function getStaticSearchDocuments(locale: string): SearchDocument[] {
  const pages = pagesByLocale[locale] ?? ruPages;

  return pages.map((page) => ({
    id: `page:${page.path}`,
    type: 'page' as const,
    title: page.title,
    href: page.path,
    description: page.description,
    keywords: page.keywords,
  }));
}
