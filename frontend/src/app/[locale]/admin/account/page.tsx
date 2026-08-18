import { AdminPanel, AdminShell } from '@/components/admin/AdminShell';
import AdminPasswordForm from '@/components/admin/admins/AdminPasswordForm';
import { requireAdminSession } from '@/lib/adminAuthServer';
import { adminAccessLevelLabels, adminSectionLabels, adminSections } from '@/lib/adminPermissions';
import { adminBadgeClassName } from '@/components/admin/adminStyles';
import { normalizeContentLocale } from '@/lib/contentLocales';

export default async function AdminAccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ contentLocale?: string }>;
}) {
  const { locale } = await params;
  const session = await requireAdminSession(locale, `/${locale}/admin/account`);
  const contentLocale = normalizeContentLocale((await searchParams).contentLocale);

  return (
    <AdminShell
      session={session}
      activeTab="account"
      backHref="/"
      backLabel="Открыть сайт"
      contentLocale={contentLocale}
      contentLocaleHref="/admin/account"
      description="Здесь можно сменить собственный пароль и увидеть, какие разделы админки вам доступны."
      locale={locale}
      title={`Профиль · ${session.username}`}>
      <AdminPanel
        className="mt-5"
        badge="Безопасность"
        title="Смена пароля"
        description="После смены пароля все остальные сессии этой учётной записи закроются, а текущая вкладка продолжит работать.">
        <AdminPasswordForm locale={locale} />
      </AdminPanel>

      <AdminPanel
        className="mt-5"
        badge="Доступ"
        title="Ваши права"
        description={
          session.isSuperAdmin
            ? 'Супер-админ управляет всеми разделами и списком администраторов.'
            : 'Права выдаёт супер-админ. Разделы без доступа не отображаются в меню.'
        }
        tone="muted">
        <ul className="grid gap-2 sm:grid-cols-2">
          {adminSections.map((section) => {
            const level = session.isSuperAdmin ? 'manage' : session.permissions[section];

            return (
              <li
                key={section}
                className="flex items-center justify-between gap-3 rounded-lg border border-[#0b5a45]/10 bg-white px-4 py-3">
                <span className="text-sm font-semibold text-[#0b3e31]">
                  {adminSectionLabels[section]}
                </span>
                <span className={adminBadgeClassName}>{adminAccessLevelLabels[level]}</span>
              </li>
            );
          })}
        </ul>
      </AdminPanel>
    </AdminShell>
  );
}
