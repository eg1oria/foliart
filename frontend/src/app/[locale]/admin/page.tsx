import { redirect } from 'next/navigation';

import { requireAdminSession } from '@/lib/adminAuthServer';

export default async function AdminIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminSession(locale, `/${locale}/admin`);

  redirect(`/${locale}/admin/products`);
}
