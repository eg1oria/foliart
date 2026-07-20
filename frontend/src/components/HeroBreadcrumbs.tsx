import { Link } from '@/i18n/routing';

export type HeroBreadcrumbItem = {
  label: string;
  href?: string;
};

export function getBreadcrumbCopy(locale: string) {
  if (locale === 'en') {
    return {
      ariaLabel: 'Breadcrumbs',
      home: 'Home',
      catalog: 'Catalog',
      articles: 'Useful articles',
    };
  }

  if (locale === 'fr') {
    return {
      ariaLabel: "Fil d'Ariane",
      home: 'Accueil',
      catalog: 'Catalogue',
      articles: 'Articles utiles',
    };
  }

  if (locale === 'es') {
    return {
      ariaLabel: 'Migas de pan',
      home: 'Inicio',
      catalog: 'Catálogo',
      articles: 'Artículos útiles',
    };
  }

  return {
    ariaLabel: 'Хлебные крошки',
    home: 'Главная',
    catalog: 'Каталог',
    articles: 'Полезные статьи',
  };
}

export default function HeroBreadcrumbs({
  items,
  locale,
}: {
  items: HeroBreadcrumbItem[];
  locale: string;
}) {
  const copy = getBreadcrumbCopy(locale);
  const breadcrumbs: HeroBreadcrumbItem[] = [{ label: copy.home, href: '/' }, ...items];

  return (
    <nav aria-label={copy.ariaLabel} className="w-full overflow-x-auto">
      <ol className="flex w-max min-w-full items-stretch gap-1.5">
        {breadcrumbs.map((item, index) => {
          const isCurrent = index === breadcrumbs.length - 1;
          const itemClassName =
            'flex items-center whitespace-nowrap p-1 px-2 text-sm font-medium leading-5 backdrop-blur-[2px] transition-colors';

          return (
            <li key={`${item.href ?? 'current'}-${index}`} className="shrink-0">
              {item.href ? (
                <Link
                  href={item.href}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={`${itemClassName} ${
                    isCurrent
                      ? 'max-w-[calc(100vw-var(--site-gutter)-var(--site-gutter))] overflow-hidden text-ellipsis bg-white/10 text-white hover:bg-white/18'
                      : 'bg-white/10 text-white/60 hover:bg-white/18 hover:text-white'
                  } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`}>
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current="page"
                  className={`${itemClassName} max-w-[calc(100vw-var(--site-gutter)-var(--site-gutter))] overflow-hidden text-ellipsis bg-white/10 text-white`}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
