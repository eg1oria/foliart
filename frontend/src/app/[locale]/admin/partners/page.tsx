import { FiEdit3, FiExternalLink, FiImage, FiPlus } from 'react-icons/fi';

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
import MediaImage from '@/components/catalog/MediaImage';
import { Link } from '@/i18n/routing';
import { requireAdminSection } from '@/lib/adminAuthServer';
import { canManageSection } from '@/lib/adminPermissions';
import { getPartners, noStoreApiFetchOptions } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media';
import { toPartnerCard } from '@/lib/partners';

import { deletePartnerAction } from './actions';

export default async function AdminPartnersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  const { locale } = await params;
  const session = await requireAdminSection(
    locale,
    'partners',
    'view',
    `/${locale}/admin/partners`,
  );
  const canManage = canManageSection(session, 'partners');
  const query = await searchParams;
  const partnersResult = await getPartners(noStoreApiFetchOptions)
    .then((partners) => ({ partners, error: false as const }))
    .catch(() => ({ partners: [], error: true as const }));
  const successMessage =
    query.status === 'created'
      ? 'Партнёр создан.'
      : query.status === 'deleted'
        ? 'Партнёр удалён.'
        : null;

  return (
    <AdminShell
      session={session}
      activeTab="partners"
      backHref="/admin/products"
      backLabel="К товарам"
      contentLocale="ru"
      contentLocaleHref="/admin/partners"
      contentLocaleHint="Карточки партнёров одинаковы для всех языков сайта."
      description="Карточки партнёров на странице «О компании». Пустые поля не выводятся на сайте."
      locale={locale}
      title="Партнёры">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link href="/about/partnery" target="_blank" className={adminCx(adminSecondaryButtonClassName, 'gap-2')}>
            <FiExternalLink aria-hidden="true" />
            Страница партнёров
          </Link>
          {canManage ? (
            <Link href="/admin/partners/new" className={adminCx(adminPrimaryButtonClassName, 'gap-2')}>
              <FiPlus aria-hidden="true" />
              Добавить партнёра
            </Link>
          ) : null}
        </div>

        {successMessage ? <AdminNotice tone="success">{successMessage}</AdminNotice> : null}
        {query.error ? <AdminNotice tone="error">{query.error}</AdminNotice> : null}

        <AdminPanel
          className="mt-4"
          badge="Партнёры"
          title="Список партнёров"
          description="Порядок вывода задаётся числом в карточке: меньшее число — выше на странице."
        >
          {partnersResult.error ? (
            <div className="space-y-5">
              <AdminNotice tone="error">Не удалось загрузить партнёров.</AdminNotice>
              <AdminEmptyState
                badge="Ошибка загрузки"
                title="Список временно недоступен"
                description="Проверьте backend API и обновите страницу."
              />
            </div>
          ) : partnersResult.partners.length === 0 ? (
            <AdminEmptyState
              badge="Пусто"
              title="Партнёров пока нет"
              description="Добавьте первого партнёра — карточка сразу появится на странице «О компании»."
            />
          ) : (
            <div className="overflow-hidden rounded-lg border border-[#0b5a45]/10 bg-white">
              <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_90px_200px] gap-4 bg-[#eef4ef] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#567068] md:grid">
                <span>Партнёр</span>
                <span>Контакты</span>
                <span>Порядок</span>
                <span className="text-right">Действия</span>
              </div>
              <div className="divide-y divide-[#0b5a45]/8">
                {partnersResult.partners.map((partner) => {
                  const card = toPartnerCard(partner);

                  return (
                    <article
                      key={partner.id}
                      className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_90px_200px] md:items-center md:gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md border border-[#0b5a45]/10 bg-white">
                          <MediaImage
                            src={resolveMediaUrl(partner.logoUrl)}
                            alt=""
                            fill
                            sizes="64px"
                            className="object-contain p-1"
                            emptyState={
                              <div className="flex h-full items-center justify-center text-[#8a9a93]">
                                <FiImage aria-hidden="true" />
                              </div>
                            }
                          />
                        </div>
                        <div className="min-w-0">
                          <h2 className="font-semibold text-[#0b3e31]">{partner.name}</h2>
                          {card.address ? (
                            <p className="mt-1 line-clamp-1 text-xs text-[#6a7f76]">{card.address}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="min-w-0 text-sm text-[#567068]">
                        {card.phones.map((phone) => (
                          <p key={phone.href} className="truncate">
                            {phone.label}
                          </p>
                        ))}
                        {card.email ? <p className="truncate">{card.email}</p> : null}
                        {card.website ? <p className="truncate">{card.website.label}</p> : null}
                        {!card.phones.length && !card.email && !card.website ? (
                          <p className="text-[#8a9a93]">Контакты не заполнены</p>
                        ) : null}
                      </div>

                      <p className="text-sm text-[#567068]">{partner.sortOrder}</p>

                      <div className="flex items-center justify-end gap-2">
                        {canManage ? (
                          <>
                            <Link
                              href={`/admin/partners/${partner.id}`}
                              className={adminCx(
                                adminSecondaryButtonClassName,
                                'h-9 min-h-9 gap-1.5 px-3 text-xs',
                              )}>
                              <FiEdit3 aria-hidden="true" />
                              Изменить
                            </Link>
                            <form action={deletePartnerAction}>
                              <input type="hidden" name="locale" value={locale} />
                              <input type="hidden" name="partnerId" value={partner.id} />
                              <AdminDeleteButton
                                className={adminCx(adminDangerButtonClassName, 'h-9 min-h-9 w-9 px-0')}
                                confirmMessage={`Удалить партнёра «${partner.name}»?`}
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
