import { FiEdit3, FiUserPlus } from 'react-icons/fi';

import AdminDeleteButton from '@/components/admin/AdminDeleteButton';
import {
  AdminEmptyState,
  AdminNotice,
  AdminPanel,
  AdminShell,
} from '@/components/admin/AdminShell';
import {
  adminBadgeClassName,
  adminCx,
  adminDangerButtonClassName,
  adminPrimaryButtonClassName,
  adminSecondaryButtonClassName,
} from '@/components/admin/adminStyles';
import { Link } from '@/i18n/routing';
import { requireSuperAdmin } from '@/lib/adminAuthServer';
import {
  adminAccessLevelLabels,
  adminSectionLabels,
  adminSections,
  normalizeAdminPermissions,
  type AdminPermissions,
} from '@/lib/adminPermissions';
import { listAdminUsers } from '@/lib/adminUsersApi';

import { deleteAdminUserAction } from './actions';
import { normalizeContentLocale } from '@/lib/contentLocales';

type AdminsSearchParams = {
  contentLocale?: string;
  error?: string;
  status?: string;
};

function getStatusMessage(status?: string) {
  if (status === 'created') return 'Администратор создан.';
  if (status === 'deleted') return 'Администратор удалён.';
  return null;
}

function formatDate(value: string | null) {
  if (!value) return '—';

  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function PermissionBadges({ permissions }: { permissions: AdminPermissions }) {
  const granted = adminSections.filter((section) => permissions[section] !== 'none');

  if (!granted.length) {
    return <span className="text-sm text-[#6a7f76]">Разделы не выданы</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {granted.map((section) => (
        <span key={section} className={adminBadgeClassName}>
          {adminSectionLabels[section]} · {adminAccessLevelLabels[permissions[section]]}
        </span>
      ))}
    </div>
  );
}

export default async function AdminAdminsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<AdminsSearchParams>;
}) {
  const { locale } = await params;
  const session = await requireSuperAdmin(locale, `/${locale}/admin/admins`);
  const query = await searchParams;
  const contentLocale = normalizeContentLocale(query.contentLocale);
  const result = await listAdminUsers();
  const admins = result.ok ? result.data : [];
  const statusMessage = getStatusMessage(query.status);

  return (
    <AdminShell
      session={session}
      activeTab="admins"
      backHref="/"
      backLabel="Открыть сайт"
      contentLocale={contentLocale}
      contentLocaleHref="/admin/admins"
      description="Создавайте учётные записи и решайте, какие разделы админки им доступны."
      locale={locale}
      title="Администраторы">
      <AdminPanel
        className="mt-5"
        badge="Доступ"
        title="Учётные записи"
        description="Права применяются сразу: при их изменении активные сессии администратора закрываются."
        headerContent={
          <Link
            href="/admin/admins/new"
            className={adminCx(adminPrimaryButtonClassName, 'gap-2')}>
            <FiUserPlus aria-hidden="true" />
            Добавить администратора
          </Link>
        }>
        <div className="space-y-4">
          {statusMessage ? <AdminNotice tone="success">{statusMessage}</AdminNotice> : null}
          {query.error ? <AdminNotice tone="error">{query.error}</AdminNotice> : null}
          {!result.ok ? <AdminNotice tone="error">{result.message}</AdminNotice> : null}
        </div>

        {admins.length === 0 ? (
          <div className="mt-5">
            <AdminEmptyState
              badge="Пусто"
              title="Администраторов пока нет"
              description="Создайте учётную запись и выдайте ей нужные разделы."
            />
          </div>
        ) : (
          <>
            <div className="mt-5 hidden overflow-hidden rounded-lg border border-[#0b5a45]/10 bg-white md:block">
              <table className="w-full table-fixed border-collapse text-left">
                <thead className="bg-[#eef4ef] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#567068]">
                  <tr>
                    <th className="w-[22%] px-4 py-3">Логин</th>
                    <th className="w-[38%] px-4 py-3">Доступ</th>
                    <th className="w-[18%] px-4 py-3">Последний вход</th>
                    <th className="w-[22%] px-4 py-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0b5a45]/8">
                  {admins.map((admin) => {
                    const permissions = normalizeAdminPermissions(admin.permissions);

                    return (
                      <tr key={admin.id} className="transition hover:bg-[#fbfcfa]">
                        <td className="px-4 py-3">
                          <p className="truncate text-sm font-semibold text-[#0b3e31]">
                            {admin.username}
                          </p>
                          {admin.isSuperAdmin ? (
                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#0b5a45]">
                              Супер-админ
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          {admin.isSuperAdmin ? (
                            <span className="text-sm text-[#567068]">Все разделы</span>
                          ) : (
                            <PermissionBadges permissions={permissions} />
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#567068]">
                          {formatDate(admin.lastLoginAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/admin/admins/${admin.id}`}
                              className={adminCx(
                                adminSecondaryButtonClassName,
                                'h-9 min-h-9 gap-1.5 px-3 text-xs',
                              )}>
                              <FiEdit3 aria-hidden="true" />
                              Настроить
                            </Link>
                            {admin.isSuperAdmin ? null : (
                              <form action={deleteAdminUserAction}>
                                <input type="hidden" name="locale" value={locale} />
                                <input type="hidden" name="adminId" value={admin.id} />
                                <AdminDeleteButton
                                  className={adminCx(
                                    adminDangerButtonClassName,
                                    'h-9 min-h-9 w-9 px-0',
                                  )}
                                  confirmMessage={`Удалить администратора «${admin.username}»? Это действие нельзя отменить.`}
                                  iconOnly
                                  pendingLabel="Удаление…">
                                  Удалить
                                </AdminDeleteButton>
                              </form>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid gap-3 md:hidden">
              {admins.map((admin) => (
                <article
                  key={admin.id}
                  className="rounded-lg border border-[#0b5a45]/10 bg-white p-4">
                  <p className="text-sm font-semibold text-[#0b3e31]">{admin.username}</p>
                  <p className="mt-1 text-xs text-[#6a7f76]">
                    {admin.isSuperAdmin ? 'Супер-админ' : 'Администратор'} · вход{' '}
                    {formatDate(admin.lastLoginAt)}
                  </p>
                  <div className="mt-3">
                    {admin.isSuperAdmin ? (
                      <span className="text-sm text-[#567068]">Все разделы</span>
                    ) : (
                      <PermissionBadges permissions={normalizeAdminPermissions(admin.permissions)} />
                    )}
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <Link
                      href={`/admin/admins/${admin.id}`}
                      className={adminCx(adminSecondaryButtonClassName, 'gap-1.5')}>
                      <FiEdit3 aria-hidden="true" />
                      Настроить
                    </Link>
                    {admin.isSuperAdmin ? null : (
                      <form action={deleteAdminUserAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="adminId" value={admin.id} />
                        <AdminDeleteButton
                          className={adminDangerButtonClassName}
                          confirmMessage={`Удалить администратора «${admin.username}»? Это действие нельзя отменить.`}
                          pendingLabel="Удаление…">
                          Удалить
                        </AdminDeleteButton>
                      </form>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </AdminPanel>
    </AdminShell>
  );
}
