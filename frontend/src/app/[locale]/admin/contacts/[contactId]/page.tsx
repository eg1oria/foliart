import { notFound } from 'next/navigation';
import { FiArrowLeft } from 'react-icons/fi';

import {
  AdminEmptyState,
  AdminNotice,
  AdminPanel,
  AdminShell,
} from '@/components/admin/AdminShell';
import RegionalContactAdminForm from '@/components/admin/contacts/RegionalContactAdminForm';
import { adminCx, adminSecondaryButtonClassName } from '@/components/admin/adminStyles';
import { Link } from '@/i18n/routing';
import { requireAdminSection } from '@/lib/adminAuthServer';
import { ApiError, getRegionalContact, noStoreApiFetchOptions } from '@/lib/api';
import { parseEntityId } from '@/lib/catalog';

export default async function EditRegionalContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ contactId: string; locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { contactId: rawContactId, locale } = await params;
  const session = await requireAdminSection(
    locale,
    'contacts',
    'manage',
    `/${locale}/admin/contacts/${rawContactId}`,
  );
  const contactId = parseEntityId(rawContactId);
  if (!contactId) notFound();

  const query = await searchParams;
  const contactResult = await getRegionalContact(contactId, noStoreApiFetchOptions)
    .then((contact) => ({ contact, error: null }))
    .catch((error: unknown) => ({ contact: null, error }));

  if (contactResult.error instanceof ApiError && contactResult.error.status === 404) {
    notFound();
  }

  const successMessage =
    query.status === 'created'
      ? 'Контакт создан.'
      : query.status === 'updated'
        ? 'Контакт сохранён.'
        : null;

  return (
    <AdminShell
      session={session}
      activeTab="contacts"
      backHref="/admin/contacts"
      backLabel="К списку контактов"
      contentLocale="ru"
      contentLocaleHref="/admin/contacts"
      contentLocaleHint="Список контактов одинаков для всех языков сайта."
      description="Изменения появляются на странице контактов сразу после сохранения."
      locale={locale}
      title={contactResult.contact?.region ?? `Контакт #${contactId}`}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-4">
          <Link href="/admin/contacts" className={adminCx(adminSecondaryButtonClassName, 'gap-2')}>
            <FiArrowLeft aria-hidden="true" />
            Назад к контактам
          </Link>
        </div>

        <AdminPanel
          badge={`Контакт #${contactId}`}
          title="Контакт в регионе"
          description="Очистите поле, чтобы убрать соответствующую строку из карточки на сайте."
        >
          {!contactResult.contact ? (
            <div className="space-y-5">
              <AdminNotice tone="error">Не удалось загрузить контакт.</AdminNotice>
              <AdminEmptyState
                badge="Ошибка загрузки"
                title="Редактор временно недоступен"
                description="Проверьте backend API и обновите страницу."
              />
            </div>
          ) : (
            <RegionalContactAdminForm
              key={contactResult.contact.id}
              contact={contactResult.contact}
              locale={locale}
              mode="edit"
              successMessage={successMessage}
            />
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
