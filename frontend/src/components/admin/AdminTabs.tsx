import { Link } from '@/i18n/routing';
import { withContentLocale } from '@/lib/contentLocales';
import type { IconType } from 'react-icons';
import { FiBookOpen, FiBox, FiCalendar } from 'react-icons/fi';

import { adminCx } from './adminStyles';

export default function AdminTabs({
  active,
  contentLocale,
  locale,
}: {
  active: 'products' | 'articles' | 'calendars';
  contentLocale: string;
  locale: string;
}) {
  const items: Array<{
    description: string;
    href: '/admin/products' | '/admin/articles' | '/admin/calendars';
    icon: IconType;
    key: 'products' | 'articles' | 'calendars';
    label: string;
  }> = [
    {
      key: 'products',
      href: '/admin/products',
      icon: FiBox,
      label: locale === 'en' ? 'Products' : '\u0422\u043e\u0432\u0430\u0440\u044b',
      description:
        locale === 'en'
          ? 'Catalog items and category translations'
          : '\u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u0438 \u043f\u0435\u0440\u0435\u0432\u043e\u0434\u044b \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0439',
    },
    {
      key: 'articles',
      href: '/admin/articles',
      icon: FiBookOpen,
      label: locale === 'en' ? 'Articles' : '\u0421\u0442\u0430\u0442\u044c\u0438',
      description:
        locale === 'en'
          ? 'Cards, dates, and rich text content'
          : '\u041a\u0430\u0440\u0442\u043e\u0447\u043a\u0438, \u0434\u0430\u0442\u044b \u0438 \u0444\u043e\u0440\u043c\u0430\u0442\u0438\u0440\u0443\u0435\u043c\u044b\u0439 \u0442\u0435\u043a\u0441\u0442',
    },
    {
      key: 'calendars',
      href: '/admin/calendars',
      icon: FiCalendar,
      label: locale === 'en' ? 'Calendar' : '\u041a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044c',
      description:
        locale === 'en'
          ? 'Crop pages and image slots'
          : '\u0421\u0442\u0440\u0430\u043d\u0438\u0446\u044b \u043a\u0443\u043b\u044c\u0442\u0443\u0440 \u0438 \u0444\u043e\u0442\u043e\u0441\u043b\u043e\u0442\u044b',
    },
  ];

  return (
    <nav className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1 [&::-webkit-scrollbar]:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.key === active;

        return (
          <Link
            key={item.key}
            href={withContentLocale(item.href, contentLocale)}
            className={adminCx(
              'flex min-h-10 shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition',
              isActive
                ? 'border-[#0b5a45] bg-[#0b5a45] text-white shadow-[0_8px_20px_-14px_rgba(11,62,49,0.8)]'
                : 'border-[#0b5a45]/12 bg-[#f7f9f6] text-[#0b3e31] hover:border-[#0b5a45]/25 hover:bg-[#eef4ef]',
            )}>
            <span
              className={adminCx(
                'inline-flex h-5 w-5 shrink-0 items-center justify-center',
                isActive ? 'text-white' : 'text-[#0b5a45]',
              )}>
              <Icon />
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
