import { FiDownload } from 'react-icons/fi';

import AdminDeleteButton from '@/components/admin/AdminDeleteButton';
import {
  AdminEmptyState,
  AdminNotice,
  AdminPanel,
  AdminShell,
} from '@/components/admin/AdminShell';
import BackupCreateButton from '@/components/admin/backups/BackupCreateButton';
import BackupRestoreDialog from '@/components/admin/backups/BackupRestoreDialog';
import {
  adminBadgeClassName,
  adminCx,
  adminDangerButtonClassName,
  adminMutedTextClassName,
  adminSecondaryButtonClassName,
} from '@/components/admin/adminStyles';
import { requireSuperAdmin } from '@/lib/adminAuthServer';
import {
  formatBackupDate,
  formatBackupSize,
  getBackupDownloadHref,
  isBackupName,
  type BackupSummary,
  type LastRestore,
} from '@/lib/backups';
import { listBackups } from '@/lib/backupsApi';

import { createBackupAction, deleteBackupAction } from './actions';

type BackupsSearchParams = {
  error?: string;
  name?: string;
  status?: string;
};

const kindLabels: Record<BackupSummary['kind'], string> = {
  manual: 'Создана вручную',
  'before-restore': 'Перед восстановлением',
};

function getStatusMessage(status?: string, name?: string) {
  if (status === 'created') {
    return isBackupName(name) ? `Резервная копия «${name}» создана.` : 'Резервная копия создана.';
  }

  if (status === 'deleted') return 'Резервная копия удалена.';

  return null;
}

function LastRestoreNotice({ lastRestore }: { lastRestore: LastRestore }) {
  const date = formatBackupDate(lastRestore.finishedAt);

  return lastRestore.status === 'ok' ? (
    <AdminNotice tone="success">
      Последнее восстановление: {date}, из копии «{lastRestore.archive}».
    </AdminNotice>
  ) : (
    <AdminNotice tone="error">
      Последнее восстановление ({date}, копия «{lastRestore.archive}») завершилось ошибкой:{' '}
      {lastRestore.message ?? 'неизвестная ошибка'}.
    </AdminNotice>
  );
}

function BackupActions({
  backup,
  compact,
  locale,
}: {
  backup: BackupSummary;
  compact?: boolean;
  locale: string;
}) {
  const buttonSize = compact ? 'h-9 min-h-9 px-3 text-xs' : '';

  return (
    <div className={adminCx('flex flex-wrap items-center gap-1.5', compact ? 'justify-end' : '')}>
      {/* A plain link: the route handler streams the file as an attachment. */}
      <a
        href={getBackupDownloadHref(backup.name)}
        download={backup.name}
        className={adminCx(adminSecondaryButtonClassName, 'gap-1.5', buttonSize)}>
        <FiDownload aria-hidden="true" />
        Скачать
      </a>
      <BackupRestoreDialog
        backup={backup}
        locale={locale}
        className={adminCx(adminSecondaryButtonClassName, buttonSize)}
      />
      <form action={deleteBackupAction}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="name" value={backup.name} />
        <AdminDeleteButton
          className={adminCx(adminDangerButtonClassName, compact ? 'h-9 min-h-9 w-9 px-0' : '')}
          confirmMessage={`Удалить резервную копию от ${formatBackupDate(backup.createdAt)}? Это действие нельзя отменить.`}
          iconOnly={compact}
          pendingLabel="Удаление…">
          Удалить
        </AdminDeleteButton>
      </form>
    </div>
  );
}

export default async function AdminBackupsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<BackupsSearchParams>;
}) {
  const { locale } = await params;
  await requireSuperAdmin(locale, `/${locale}/admin/backups`);
  const query = await searchParams;
  const result = await listBackups();
  const overview = result.ok ? result.data : null;
  const backups = overview?.backups ?? [];
  const statusMessage = getStatusMessage(query.status, query.name);
  const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);

  return (
    <AdminShell
      contentWidth="6xl"
      title="Резервные копии"
      description="Копия всего сайта: база данных и все загруженные изображения."
      stats={[
        { label: 'Копий на сервере', value: String(backups.length) },
        {
          label: 'Последняя копия',
          value: backups[0] ? formatBackupDate(backups[0].createdAt) : '',
        },
        { label: 'Занимают', value: backups.length ? formatBackupSize(totalSize) : '' },
      ]}>
      <div className="space-y-6">
        <AdminPanel
          badge="Новая копия"
          title="Создать резервную копию"
          description="Копия сохраняет товары, категории, статьи, календарь, партнёров, контакты, переводы, изображения и учётные записи администраторов. Сайт продолжает работать, пока она создаётся.">
          <div className="space-y-4">
            {statusMessage ? <AdminNotice tone="success">{statusMessage}</AdminNotice> : null}
            {query.error ? <AdminNotice tone="error">{query.error}</AdminNotice> : null}
            {!result.ok ? <AdminNotice tone="error">{result.message}</AdminNotice> : null}
            {overview?.busy ? (
              <AdminNotice tone="error">
                {overview.busy === 'restore'
                  ? 'Сейчас идёт восстановление — дождитесь его окончания.'
                  : 'Сейчас создаётся другая копия — повторите через минуту.'}
              </AdminNotice>
            ) : null}
            {overview?.lastRestore ? <LastRestoreNotice lastRestore={overview.lastRestore} /> : null}

            <form action={createBackupAction}>
              <input type="hidden" name="locale" value={locale} />
              <BackupCreateButton disabled={!result.ok || Boolean(overview?.busy)} />
            </form>
          </div>
        </AdminPanel>

        <AdminPanel
          badge="Архив"
          title="Сохранённые копии"
          description={`На сервере хранятся ${overview?.keep ?? 10} последних копий — более старые удаляются автоматически. Важные копии скачивайте к себе: копия на сервере не спасёт, если пропадёт сам сервер.`}>
          {backups.length === 0 ? (
            <AdminEmptyState
              badge="Пусто"
              title="Копий пока нет"
              description="Создайте первую резервную копию кнопкой выше."
            />
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-lg border border-[#0b5a45]/10 bg-white md:block">
                <table className="w-full table-fixed border-collapse text-left">
                  <thead className="bg-[#eef4ef] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#567068]">
                    <tr>
                      <th className="w-[28%] px-4 py-3">Дата</th>
                      <th className="w-[11%] px-4 py-3">Размер</th>
                      <th className="w-[20%] px-4 py-3">Тип</th>
                      <th className="w-[41%] px-4 py-3 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0b5a45]/8">
                    {backups.map((backup) => (
                      <tr key={backup.name} className="transition hover:bg-[#fbfcfa]">
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-[#0b3e31]">
                            {formatBackupDate(backup.createdAt)}
                          </p>
                          <p className="mt-1 truncate text-xs text-[#6a7f76]" title={backup.name}>
                            {backup.name}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#567068]">
                          {formatBackupSize(backup.size)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={adminBadgeClassName}>{kindLabels[backup.kind]}</span>
                        </td>
                        <td className="px-4 py-3">
                          <BackupActions backup={backup} compact locale={locale} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 md:hidden">
                {backups.map((backup) => (
                  <article
                    key={backup.name}
                    className="rounded-lg border border-[#0b5a45]/10 bg-white p-4">
                    <p className="text-sm font-semibold text-[#0b3e31]">
                      {formatBackupDate(backup.createdAt)}
                    </p>
                    <p className="mt-1 text-xs text-[#6a7f76]">
                      {formatBackupSize(backup.size)} · {kindLabels[backup.kind]}
                    </p>
                    <div className="mt-4">
                      <BackupActions backup={backup} locale={locale} />
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </AdminPanel>

        <AdminPanel tone="muted" title="Как работает восстановление">
          <ul className={adminCx('list-disc space-y-2 pl-5', adminMutedTextClassName)}>
            <li>
              Сайт полностью возвращается к состоянию на момент копии; всё, что изменили позже,
              пропадает.
            </li>
            <li>
              Перед восстановлением автоматически создаётся копия текущего состояния с пометкой
              «Перед восстановлением» — через неё можно отменить восстановление.
            </li>
            <li>Во время восстановления сайт недоступен примерно полминуты.</li>
            <li>
              Копию, сделанную до обновления сайта с изменением структуры базы, восстановить из
              админки нельзя — в этом случае обратитесь к разработчику.
            </li>
            <li>Ежедневные автоматические копии сервера хранятся отдельно и здесь не показаны.</li>
          </ul>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
