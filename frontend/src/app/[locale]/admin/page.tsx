import { redirect } from 'next/navigation';

import { getAdminNoAccessPath, requireAdminSession } from '@/lib/adminAuthServer';
import { adminSectionPaths, getFirstAllowedSection } from '@/lib/adminPermissions';

export default async function AdminIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireAdminSession(locale, `/${locale}/admin`);
  const section = getFirstAllowedSection(session);

  if (!section) {
    redirect(session.isSuperAdmin ? `/${locale}/admin/admins` : getAdminNoAccessPath(locale));
  }

  redirect(`/${locale}${adminSectionPaths[section]}`);
}
