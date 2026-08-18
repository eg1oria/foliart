import { FiEdit3, FiExternalLink, FiPlus } from 'react-icons/fi';

import AdminDeleteButton from '@/components/admin/AdminDeleteButton';
import {
  AdminEmptyState,
  AdminNotice,
  AdminPanel,
  AdminShell,
} from '@/components/admin/AdminShell';
import {
  adminCx,
  adminDangerButtonClassName,
  adminPrimaryButtonClassName,
  adminSecondaryButtonClassName,
} from '@/components/admin/adminStyles';
import { Link } from '@/i18n/routing';
import { requireAdminSection } from '@/lib/adminAuthServer';
import { canManageSection } from '@/lib/adminPermissions';
import { getRegionalContacts, noStoreApiFetchOptions } from '@/lib/api';
import { toRegionalContactCard } from '@/lib/regionalContacts';

import { deleteRegionalContactAction } from './actions';

export default async function AdminContactsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  const { locale } = await params;
  const session = await requireAdminSection(
    locale,
    'contacts',
    'view',
    `/${locale}/admin/contacts`,
  );
  const canManage = canManageSection(session, 'contacts');
  const query = await searchParams;
  const contactsResult = await getRegionalContacts(noStoreApiFetchOptions)
    .then((contacts) => ({ contacts, error: false as const }))
    .catch(() => ({ contacts: [], error: true as const }));
  const successMessage =
    query.status === 'created'
      ? 'Контакт создан.'
      : query.status === 'deleted'
        ? 'Контакт удалён.'
        : null;

  return (
    <AdminShell
      session={session}
      activeTab="contacts"
      backHref="/admin/partners"
      backLabel="К партнёрам"
      contentLocale="ru"
      contentLocaleHref="/admin/contacts"
      contentLocaleHint="Список контактов одинаков для всех языков сайта."
      description="Контакты в регионах — список под картой на странице «Контакты». Пустые поля не выводятся."
      locale={locale}
      title="Контакты в регионах">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/contacts"
            target="_blank"
            className={adminCx(adminSecondaryButtonClassName, 'gap-2')}>
            <FiExternalLink aria-hidden="true" />
            Страница контактов
          </Link>
          {canManage ? (
            <Link
              href="/admin/contacts/new"
              className={adminCx(adminPrimaryButtonClassName, 'gap-2')}>
              <FiPlus aria-hidden="true" />
              Добавить контакт
            </Link>
          ) : null}
        </div>

        {successMessage ? <AdminNotice tone="success">{successMessage}</AdminNotice> : null}
        {query.error ? <AdminNotice tone="error">{query.error}</AdminNotice> : null}

        <AdminPanel
          className="mt-4"
          badge="Контакты"
          title="Список контактов"
          description="Порядок вывода задаётся числом в карточке: меньшее число — выше на странице."
        >
          {contactsResult.error ? (
            <div className="space-y-5">
              <AdminNotice tone="error">Не удалось загрузить контакты.</AdminNotice>
              <AdminEmptyState
                badge="Ошибка загрузки"
                title="Список временно недоступен"
                description="Проверьте backend API и обновите страницу."
              />
            </div>
          ) : contactsResult.contacts.length === 0 ? (
            <AdminEmptyState
              badge="Пусто"
              title="Контактов пока нет"
              description="Добавьте первый регион — блок появится под картой на странице «Контакты»."
            />
          ) : (
            <div className="overflow-hidden rounded-lg border border-[#0b5a45]/10 bg-white">
              <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_90px_170px] gap-4 bg-[#eef4ef] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#567068] md:grid">
                <span>Регион</span>
                <span>ФИО</span>
                <span>Телефон и адрес</span>
                <span>Порядок</span>
                <span className="text-right">Действия</span>
              </div>
              <div className="divide-y divide-[#0b5a45]/8">
                {contactsResult.contacts.map((contact) => {
                  const card = toRegionalContactCard(contact);

                  return (
                    <article
                      key={contact.id}
                      className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_90px_170px] md:items-center md:gap-4">
                      <h2 className="min-w-0 font-semibold text-[#0b3e31]">{contact.region}</h2>
                      <p className="min-w-0 text-sm text-[#567068]">
                        {card.fullName ?? <span className="text-[#8a9a93]">Не указано</span>}
                      </p>
                      <div className="min-w-0 text-sm text-[#567068]">
                        {card.phone ? <p className="truncate">{card.phone.label}</p> : null}
                        {card.address ? (
                          <p className="line-clamp-2 text-xs text-[#6a7f76]">{card.address}</p>
                        ) : null}
                        {!card.phone && !card.address ? (
                          <p className="text-[#8a9a93]">Контакты не заполнены</p>
                        ) : null}
                      </div>
                      <p className="text-sm text-[#567068]">{contact.sortOrder}</p>
                      <div className="flex items-center justify-end gap-2">
                        {canManage ? (
                          <>
                            <Link
                              href={`/admin/contacts/${contact.id}`}
                              className={adminCx(
                                adminSecondaryButtonClassName,
                                'h-9 min-h-9 gap-1.5 px-3 text-xs',
                              )}>
                              <FiEdit3 aria-hidden="true" />
                              Изменить
                            </Link>
                            <form action={deleteRegionalContactAction}>
                              <input type="hidden" name="locale" value={locale} />
                              <input type="hidden" name="contactId" value={contact.id} />
                              <AdminDeleteButton
                                className={adminCx(
                                  adminDangerButtonClassName,
                                  'h-9 min-h-9 w-9 px-0',
                                )}
                                confirmMessage={`Удалить контакт «${contact.region}»?`}
                                iconOnly
                                pendingLabel="Удаление…">
                                Удалить
                              </AdminDeleteButton>
                            </form>
                          </>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
