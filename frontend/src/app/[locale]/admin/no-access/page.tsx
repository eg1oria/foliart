import { redirect } from 'next/navigation';
import { FiLock, FiLogOut } from 'react-icons/fi';

import {
  adminCx,
  adminGhostLinkClassName,
  adminHintClassName,
} from '@/components/admin/adminStyles';
import { requireAdminSession } from '@/lib/adminAuthServer';
import { adminSectionPaths, getFirstAllowedSection } from '@/lib/adminPermissions';
import { logoutAdminAction } from '@/lib/adminSessionActions';

// Dead end for an admin whose sections have all been taken away. It never
// shows up on its own: `requireAdminSection` sends people here only when there
// is nothing else left to open.
export default async function AdminNoAccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireAdminSession(locale, `/${locale}/admin/no-access`);
  const section = getFirstAllowedSection(session);

  if (section) {
    redirect(`/${locale}${adminSectionPaths[section]}`);
  }

  if (session.isSuperAdmin) {
    redirect(`/${locale}/admin/admins`);
  }

  return (
    <main className="relative flex min-h-screen w-full flex-1 items-center bg-[#f3f5f1] px-4 py-12 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-[560px] rounded-lg border border-[#0b5a45]/10 bg-white px-6 py-9 text-center shadow-[0_24px_70px_-54px_rgba(11,62,49,0.95)] sm:px-8">
        <span className="inline-flex items-center gap-2 rounded-md border border-[#0b5a45]/12 bg-[#eef4ef] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0b5a45]">
          <FiLock className="text-sm" />
          Foliart Admin
        </span>

        <h1 className="mt-4 text-2xl font-semibold leading-tight text-[#0b3e31]">
          Разделы пока не выданы
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#567068]">
          Учётная запись «{session.username}» существует, но ни один раздел админки ей сейчас
          не доступен. Попросите супер-админа выдать права.
        </p>

        <form action={logoutAdminAction} className="mt-6 flex justify-center">
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className={adminCx(adminGhostLinkClassName, 'gap-2')}>
            <span>Выйти</span>
            <FiLogOut className="shrink-0" />
          </button>
        </form>

        <p className={adminCx('mt-4', adminHintClassName)}>
          После изменения прав достаточно обновить страницу.
        </p>
      </section>
    </main>
  );
}
