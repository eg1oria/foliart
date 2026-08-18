import { notFound } from 'next/navigation';

import { AdminNotice, AdminPanel, AdminShell } from '@/components/admin/AdminShell';
import AdminUserPasswordResetForm from '@/components/admin/admins/AdminUserPasswordResetForm';
import AdminUserPermissionsForm from '@/components/admin/admins/AdminUserPermissionsForm';
import { requireSuperAdmin } from '@/lib/adminAuthServer';
import { normalizeAdminPermissions } from '@/lib/adminPermissions';
import { getAdminUser } from '@/lib/adminUsersApi';
import { parseEntityId } from '@/lib/catalog';
import { normalizeContentLocale } from '@/lib/contentLocales';

export default async function AdminUserEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ adminId: string; locale: string }>;
  searchParams: Promise<{ contentLocale?: string }>;
}) {
  const { adminId: rawAdminId, locale } = await params;
  const session = await requireSuperAdmin(locale, `/${locale}/admin/admins/${rawAdminId}`);
  const adminId = parseEntityId(rawAdminId);

  if (!adminId) notFound();

  const contentLocale = normalizeContentLocale((await searchParams).contentLocale);
  const result = await getAdminUser(adminId);

  if (!result.ok) {
    return (
      <AdminShell
        session={session}
        activeTab="admins"
        backHref="/"
        backLabel="Открыть сайт"
        contentLocale={contentLocale}
        contentLocaleHref={`/admin/admins/${adminId}`}
        description="Не удалось загрузить учётную запись."
        locale={locale}
        title="Администратор">
        <div className="mt-5">
          <AdminNotice tone="error">{result.message}</AdminNotice>
        </div>
      </AdminShell>
    );
  }

  const admin = result.data;

  return (
    <AdminShell
      session={session}
      activeTab="admins"
      backHref="/"
      backLabel="Открыть сайт"
      contentLocale={contentLocale}
      contentLocaleHref={`/admin/admins/${adminId}`}
      description={
        admin.isSuperAdmin
          ? 'Супер-админу доступны все разделы; здесь можно только задать новый пароль.'
          : 'Настройте доступ к разделам или задайте новый пароль.'
      }
      locale={locale}
      title={`Администратор · ${admin.username}`}>
      {admin.isSuperAdmin ? (
        <div className="mt-5">
          <AdminNotice tone="success">
            Это учётная запись супер-админа: её права нельзя ограничить, а саму запись — удалить.
          </AdminNotice>
        </div>
      ) : (
        <AdminPanel
          className="mt-5"
          badge="Доступ"
          title="Разделы админки"
          description="После сохранения администратору потребуется войти заново.">
          <AdminUserPermissionsForm
            adminId={admin.id}
            locale={locale}
            permissions={normalizeAdminPermissions(admin.permissions)}
          />
        </AdminPanel>
      )}

      <AdminPanel
        className="mt-5"
        badge="Безопасность"
        title="Новый пароль"
        description="Текущий пароль знать не нужно. Прежние сессии закроются сразу после сохранения."
        tone="muted">
        <AdminUserPasswordResetForm adminId={admin.id} locale={locale} />
      </AdminPanel>
    </AdminShell>
  );
}
