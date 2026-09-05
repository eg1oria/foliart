import { AdminPanel, AdminShell } from '@/components/admin/AdminShell';
import AdminUserCreateForm from '@/components/admin/admins/AdminUserCreateForm';
import { requireSuperAdmin } from '@/lib/adminAuthServer';
import { listAdminUsers } from '@/lib/adminUsersApi';

export default async function AdminUserNewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireSuperAdmin(locale, `/${locale}/admin/admins/new`);
  const admins = await listAdminUsers();

  return (
    <AdminShell
      description="Логин и пароль понадобятся администратору для входа, права можно изменить в любой момент."
      title="Новый администратор">
      <AdminPanel
        badge="Учётная запись"
        title="Данные для входа и доступ"
        description="Пароль хранится только в виде хеша, посмотреть его позже нельзя — при потере задайте новый.">
        <AdminUserCreateForm
          locale={locale}
          takenUsernames={admins.ok ? admins.data.map((admin) => admin.username) : []}
        />
      </AdminPanel>
    </AdminShell>
  );
}
