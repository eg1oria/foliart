import { notFound } from 'next/navigation';
import { FiArrowLeft } from 'react-icons/fi';

import {
  AdminEmptyState,
  AdminNotice,
  AdminPanel,
  AdminShell,
} from '@/components/admin/AdminShell';
import PartnerAdminForm from '@/components/admin/partners/PartnerAdminForm';
import { adminCx, adminSecondaryButtonClassName } from '@/components/admin/adminStyles';
import { Link } from '@/i18n/routing';
import { requireAdminSection } from '@/lib/adminAuthServer';
import { ApiError, getPartner, noStoreApiFetchOptions } from '@/lib/api';
import { parseEntityId } from '@/lib/catalog';

export default async function EditPartnerPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; partnerId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale, partnerId: rawPartnerId } = await params;
  const session = await requireAdminSection(
    locale,
    'partners',
    'manage',
    `/${locale}/admin/partners/${rawPartnerId}`,
  );
  const partnerId = parseEntityId(rawPartnerId);
  if (!partnerId) notFound();

  const query = await searchParams;
  const partnerResult = await getPartner(partnerId, noStoreApiFetchOptions)
    .then((partner) => ({ partner, error: null }))
    .catch((error: unknown) => ({ partner: null, error }));

  if (partnerResult.error instanceof ApiError && partnerResult.error.status === 404) {
    notFound();
  }

  const successMessage =
    query.status === 'created'
      ? 'Партнёр создан.'
      : query.status === 'updated'
        ? 'Партнёр сохранён.'
        : null;

  return (
    <AdminShell
      session={session}
      activeTab="partners"
      backHref="/admin/partners"
      backLabel="К списку партнёров"
      contentLocale="ru"
      contentLocaleHref="/admin/partners"
      contentLocaleHint="Карточки партнёров одинаковы для всех языков сайта."
      description="Изменения появляются на странице партнёров сразу после сохранения."
      locale={locale}
      title={partnerResult.partner?.name ?? `Партнёр #${partnerId}`}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-4">
          <Link
            href="/admin/partners"
            className={adminCx(adminSecondaryButtonClassName, 'gap-2')}>
            <FiArrowLeft aria-hidden="true" />
            Назад к партнёрам
          </Link>
        </div>

        <AdminPanel
          badge={`Партнёр #${partnerId}`}
          title="Карточка партнёра"
          description="Очистите поле, чтобы убрать соответствующую строку из карточки на сайте."
        >
          {!partnerResult.partner ? (
            <div className="space-y-5">
              <AdminNotice tone="error">Не удалось загрузить партнёра.</AdminNotice>
              <AdminEmptyState
                badge="Ошибка загрузки"
                title="Редактор временно недоступен"
                description="Проверьте backend API и обновите страницу."
              />
            </div>
          ) : (
            <PartnerAdminForm
              key={partnerResult.partner.id}
              locale={locale}
              mode="edit"
              partner={partnerResult.partner}
              successMessage={successMessage}
            />
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
