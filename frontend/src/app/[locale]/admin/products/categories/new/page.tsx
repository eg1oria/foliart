import { FiArrowLeft } from 'react-icons/fi';

import { AdminPanel, AdminShell } from '@/components/admin/AdminShell';
import CategoryCreateForm from '@/components/admin/products/CategoryCreateForm';
import { adminCx, adminSecondaryButtonClassName } from '@/components/admin/adminStyles';
import { Link } from '@/i18n/routing';
import { requireAdminSection } from '@/lib/adminAuthServer';
import { withContentLocale } from '@/lib/contentLocales';

export default async function NewProductCategoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminSection(
    locale,
    'products',
    'manage',
    `/${locale}/admin/products/categories/new`,
  );

  return (
    <AdminShell
      description="Категория создаётся на русском языке; переводы и изображение можно дополнить сразу после сохранения."
      title="Новая категория"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-4">
          <Link
            href={withContentLocale('/admin/products/categories', 'ru')}
            className={adminCx(adminSecondaryButtonClassName, 'gap-2')}
          >
            <FiArrowLeft aria-hidden="true" />
            Назад к категориям
          </Link>
        </div>

        <AdminPanel
          badge="Создание"
          title="Основная карточка категории"
          description="Обязательно только название. Новая категория появляется в каталоге сразу и остаётся пустой, пока в неё не добавят товары."
        >
          <CategoryCreateForm locale={locale} />
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
