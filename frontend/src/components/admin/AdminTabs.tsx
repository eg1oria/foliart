import { Link } from '@/i18n/routing';
import type { IconType } from 'react-icons';
import { FiBookOpen, FiBox, FiCalendar } from 'react-icons/fi';

import { adminCx } from './adminStyles';

export default function AdminTabs({
  active,
  locale,
}: {
  active: 'products' | 'articles' | 'calendars';
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
    <div className="mt-6 grid gap-3 md:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.key === active;

        return (
          <Link
            key={item.key}
            href={item.href}
            className={adminCx(
              'rounded-[1.35rem] border px-4 py-4 text-left transition',
              isActive
                ? 'border-white/15 bg-white text-[#0b3e31] shadow-[0_24px_40px_-34px_rgba(11,62,49,0.9)]'
                : 'border-white/12 bg-white/8 text-white hover:bg-white/12',
            )}>
            <div className="flex items-start gap-3">
              <span
                className={adminCx(
                  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-lg',
                  isActive
                    ? 'border-[#0b5a45]/12 bg-[#eef4ef] text-[#0b5a45]'
                    : 'border-white/12 bg-white/10 text-white',
                )}>
                <Icon />
              </span>

              <div className="min-w-0">
                <p
                  className={adminCx(
                    'text-sm font-semibold sm:text-base',
                    isActive ? 'text-[#0b3e31]' : 'text-white',
                  )}>
                  {item.label}
                </p>
                <p
                  className={adminCx(
                    'mt-1 text-sm leading-6',
                    isActive ? 'text-[#567068]' : 'text-white/72',
                  )}>
                  {item.description}
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
