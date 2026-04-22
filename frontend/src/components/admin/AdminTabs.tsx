import { Link } from '@/i18n/routing';

export default function AdminTabs({
  active,
  locale,
}: {
  active: 'products' | 'articles';
  locale: string;
}) {
  const items = [
    {
      key: 'products' as const,
      href: '/admin/products',
      label: locale === 'en' ? 'Products' : 'Товары',
    },
    {
      key: 'articles' as const,
      href: '/admin/articles',
      label: locale === 'en' ? 'Articles' : 'Статьи',
    },
  ];

  return (
    <div className="mt-8 flex flex-wrap gap-3">
      {items.map((item) => {
        const isActive = item.key === active;

        return (
          <Link
            key={item.key}
            href={item.href}
            className={`inline-flex items-center rounded-full px-5 py-3 text-sm font-medium transition ${
              isActive
                ? 'bg-white text-[#0b3e31] shadow-[0_20px_30px_-24px_rgba(11,62,49,0.95)]'
                : 'border border-white/20 bg-white/10 text-white hover:bg-white/18'
            }`}>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
