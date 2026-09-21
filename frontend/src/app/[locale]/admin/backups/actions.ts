'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { isSupportedAdminLocale } from '@/lib/adminAuth';
import { requireSuperAdmin } from '@/lib/adminAuthServer';
import { isBackupName, RESTORE_CONFIRMATION_WORD } from '@/lib/backups';
import { createBackup, deleteBackup, restoreBackup } from '@/lib/backupsApi';

export type RestoreBackupActionState =
  | { status: 'idle' }
  | { message: string; status: 'error' }
  | { requestedAt: string; safetyBackup: string; status: 'started' };

function normalizeLocale(value: FormDataEntryValue | null) {
  return typeof value === 'string' && isSupportedAdminLocale(value) ? value : 'ru';
}

function backupsPath(locale: string, query?: Record<string, string>) {
  const search = query ? `?${new URLSearchParams(query).toString()}` : '';

  return `/${locale}/admin/backups${search}`;
}

export async function createBackupAction(formData: FormData) {
  const locale = normalizeLocale(formData.get('locale'));
  await requireSuperAdmin(locale);

  const result = await createBackup();

  revalidatePath(backupsPath(locale));
  redirect(
    result.ok
      ? backupsPath(locale, { status: 'created', name: result.data.name })
      : backupsPath(locale, { error: result.message }),
  );
}

export async function deleteBackupAction(formData: FormData) {
  const locale = normalizeLocale(formData.get('locale'));
  await requireSuperAdmin(locale);

  const name = formData.get('name');

  if (!isBackupName(name)) {
    redirect(backupsPath(locale, { error: 'Резервная копия не найдена.' }));
  }

  const result = await deleteBackup(name);

  revalidatePath(backupsPath(locale));
  redirect(
    result.ok
      ? backupsPath(locale, { status: 'deleted' })
      : backupsPath(locale, { error: result.message }),
  );
}

export async function restoreBackupAction(
  _previousState: RestoreBackupActionState,
  formData: FormData,
): Promise<RestoreBackupActionState> {
  const locale = normalizeLocale(formData.get('locale'));
  await requireSuperAdmin(locale);

  const name = formData.get('name');
  const confirmation = formData.get('confirmation');

  if (!isBackupName(name)) {
    return { status: 'error', message: 'Резервная копия не найдена.' };
  }

  if (
    typeof confirmation !== 'string' ||
    confirmation.trim().toUpperCase() !== RESTORE_CONFIRMATION_WORD
  ) {
    return {
      status: 'error',
      message: `Для подтверждения введите слово «${RESTORE_CONFIRMATION_WORD}».`,
    };
  }

  const result = await restoreBackup(name);

  if (!result.ok) {
    return { status: 'error', message: result.message };
  }

  return { status: 'started', ...result.data };
}
