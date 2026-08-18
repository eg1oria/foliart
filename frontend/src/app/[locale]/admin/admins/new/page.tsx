import { AdminPanel, AdminShell } from '@/components/admin/AdminShell';
import AdminUserCreateForm from '@/components/admin/admins/AdminUserCreateForm';
import { requireSuperAdmin } from '@/lib/adminAuthServer';
import { normalizeContentLocale } from '@/lib/contentLocales';

export default async function AdminUserNewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ contentLocale?: string }>;
}) {
  const { locale } = await params;
  const session = await requireSuperAdmin(locale, `/${locale}/admin/admins/new`);
  const contentLocale = normalizeContentLocale((await searchParams).contentLocale);

  return (
    <AdminShell
      session={session}
      activeTab="admins"
      backHref="/"
      backLabel="Открыть сайт"
      contentLocale={contentLocale}
      contentLocaleHref="/admin/admins/new"
      description="Логин и пароль понадобятся администратору для входа, права можно изменить в любой момент."
      locale={locale}
      title="Новый администратор">
      <AdminPanel
        className="mt-5"
        badge="Учётная запись"
        title="Данные для входа и доступ"
        description="Пароль хранится только в виде хеша, посмотреть его позже нельзя — при потере задайте новый.">
        <AdminUserCreateForm locale={locale} />
      </AdminPanel>
    </AdminShell>
  );
}
