import {
  AdminNotice,
  AdminPanel,
  AdminShell,
} from '@/components/admin/AdminShell';
import UiMessagesEditor from '@/components/admin/UiMessagesEditor';
import {
  getBundledUiMessages,
  mergeUiMessages,
  type UiMessageDocument,
} from '@/i18n/uiMessages';
import { getUiMessagesForAdmin } from '@/i18n/uiMessagesServer';
import { requireAdminSession } from '@/lib/adminAuthServer';
import { normalizeContentLocale } from '@/lib/contentLocales';

export default async function AdminMessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ contentLocale?: string }>;
}) {
  const { locale } = await params;
  await requireAdminSession(locale, `/${locale}/admin/messages`);
  const query = await searchParams;
  const targetLocale = normalizeContentLocale(query.contentLocale);

  let stored;
  try {
    stored = await getUiMessagesForAdmin(targetLocale);
  } catch {
    stored = null;
  }

  let russianMessages = getBundledUiMessages('ru');
  if (targetLocale !== 'ru') {
    try {
      const russianStored = await getUiMessagesForAdmin('ru');
      russianMessages = mergeUiMessages(
        getBundledUiMessages('ru'),
        russianStored.messages,
      ) as UiMessageDocument;
    } catch {
      // The embedded Russian document remains a safe reference.
    }
  }

  return (
    <AdminShell
      activeTab="messages"
      backHref="/"
      backLabel="Открыть сайт"
      contentLocale={targetLocale}
      contentLocaleHint="Выберите язык, сообщения которого нужно изменить."
      contentLocaleTitle="Язык перевода"
      description="Редактируйте интерфейсные тексты без пересборки и перезапуска сайта. Структура ключей и ICU-параметры защищены."
      locale={locale}
      title="Интерфейсные переводы"
    >
      <AdminPanel
        badge="Runtime i18n"
        title={`Сообщения ${targetLocale.toUpperCase()}`}
        description="Изменения применяются к публичному сайту после сохранения и следующего обновления или перехода пользователя."
      >
        {!stored ? (
          <AdminNotice tone="error">
            Не удалось получить актуальную версию переводов из backend. Редактор
            заблокирован, чтобы не перезаписать данные устаревшей копией.
          </AdminNotice>
        ) : (
          <UiMessagesEditor
            key={`${targetLocale}:${stored.revision}`}
            adminLocale={locale}
            bundledMessages={getBundledUiMessages(targetLocale)}
            hasOverride={stored.messages !== null}
            initialMessages={
              mergeUiMessages(
                getBundledUiMessages(targetLocale),
                stored.messages,
              ) as UiMessageDocument
            }
            revision={stored.revision}
            russianMessages={russianMessages}
            targetLocale={targetLocale}
            updatedAt={stored.updatedAt}
          />
        )}
      </AdminPanel>
    </AdminShell>
  );
}
