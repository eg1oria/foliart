import { FiExternalLink } from 'react-icons/fi';

import AdminDeleteButton from '@/components/admin/AdminDeleteButton';
import { AdminNotice, AdminPanel, AdminShell } from '@/components/admin/AdminShell';
import CertificateAdminForm from '@/components/admin/certificates/CertificateAdminForm';
import { adminCx, adminDangerButtonClassName } from '@/components/admin/adminStyles';
import { Link } from '@/i18n/routing';
import { requireAdminSection } from '@/lib/adminAuthServer';
import { canManageSection } from '@/lib/adminPermissions';
import { getCertificate, noStoreApiFetchOptions, type Certificate } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media';

import { deleteCertificateAction } from './actions';

const emptyCertificate: Certificate = {
  slug: 'conformity',
  fileUrl: '',
  mimeType: '',
  originalName: '',
  updatedAt: null,
};

function formatUpdatedAt(value: string | null) {
  if (!value) return '';

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? ''
    : new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeStyle: 'short' }).format(parsed);
}

export default async function AdminCertificatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  const { locale } = await params;
  const session = await requireAdminSection(
    locale,
    'certificates',
    'view',
    `/${locale}/admin/certificates`,
  );
  const canManage = canManageSection(session, 'certificates');
  const query = await searchParams;
  const certificateResult = await getCertificate(undefined, noStoreApiFetchOptions)
    .then((certificate) => ({ certificate, error: false as const }))
    .catch(() => ({ certificate: emptyCertificate, error: true as const }));
  const { certificate } = certificateResult;
  const storedHref = resolveMediaUrl(certificate.fileUrl);
  const updatedAt = formatUpdatedAt(certificate.updatedAt);
  const successMessage =
    query.status === 'updated'
      ? 'Сертификат загружен.'
      : query.status === 'deleted'
        ? 'Сертификат удалён — на сайте снова показывается встроенный файл.'
        : null;

  return (
    <AdminShell
      description="Файл сертификата соответствия, на который ведёт ссылка в карточке каждого товара."
      title="Сертификат соответствия"
      contentWidth="4xl"
      stats={[
        {
          label: 'Текущий файл',
          value: certificate.fileUrl
            ? certificate.mimeType === 'application/pdf'
              ? 'PDF'
              : 'Изображение'
            : 'Встроенный в сайт',
          hint: certificate.originalName || undefined,
        },
        { label: 'Обновлён', value: updatedAt },
      ]}>
      <div className="space-y-4">
        {successMessage ? <AdminNotice tone="success">{successMessage}</AdminNotice> : null}
        {query.error ? <AdminNotice tone="error">{query.error}</AdminNotice> : null}
        {certificateResult.error ? (
          <AdminNotice tone="error">
            Не удалось загрузить данные сертификата. Проверьте backend API и обновите страницу.
          </AdminNotice>
        ) : null}

        <AdminPanel
          badge="Сертификат"
          title="Сертификат соответствия"
          description="Загрузите скан или фотографию сертификата. Ссылка «Сертификат соответствия» на страницах товаров сразу начнёт открывать новый файл."
          headerContent={
            storedHref ? (
              <a
                href={storedHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b5a45] underline underline-offset-4">
                <FiExternalLink aria-hidden="true" />
                Открыть файл
              </a>
            ) : null
          }>
          {canManage ? (
            <CertificateAdminForm certificate={certificate} locale={locale} />
          ) : (
            <p className="text-sm leading-6 text-[#567068]">
              {storedHref
                ? 'Файл загружен. Для замены нужен полный доступ к разделу.'
                : 'Сертификат ещё не загружен. Для загрузки нужен полный доступ к разделу.'}
            </p>
          )}

          {canManage && certificate.fileUrl ? (
            <form action={deleteCertificateAction} className="mt-5 border-t border-[#0b5a45]/10 pt-5">
              <input type="hidden" name="locale" value={locale} />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-xl text-xs leading-5 text-[#6a7f76]">
                  После удаления ссылка на страницах товаров вернётся к файлу, встроенному в
                  сайт.
                </p>
                <AdminDeleteButton
                  className={adminCx(adminDangerButtonClassName, 'gap-2')}
                  confirmMessage="Удалить загруженный сертификат соответствия?"
                  pendingLabel="Удаление…">
                  Удалить загруженный файл
                </AdminDeleteButton>
              </div>
            </form>
          ) : null}
        </AdminPanel>

        <p className="text-xs leading-5 text-[#6a7f76]">
          Проверить результат можно в{' '}
          <Link
            href="/catalog"
            target="_blank"
            className="font-semibold text-[#0b5a45] underline underline-offset-4">
            каталоге
          </Link>{' '}
          — ссылка находится в блоке «Состав» карточки товара.
        </p>
      </div>
    </AdminShell>
  );
}
