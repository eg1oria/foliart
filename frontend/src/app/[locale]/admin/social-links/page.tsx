import { AdminNotice, AdminPanel, AdminShell } from '@/components/admin/AdminShell';
import SocialLinksEditor from '@/components/admin/social-links/SocialLinksEditor';
import { requireAdminSection } from '@/lib/adminAuthServer';
import { canManageSection } from '@/lib/adminPermissions';
import { getSocialLinks, noStoreApiFetchOptions } from '@/lib/api';
import { getContentLocaleLabel, normalizeContentLocale } from '@/lib/contentLocales';
import {
  maxSocialLinks,
  maxSocialLinksInRow,
  splitSocialLinksForRow,
  type SocialLink,
} from '@/lib/socialLinks';

export default async function AdminSocialLinksPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ contentLocale?: string }>;
}) {
  const { locale } = await params;
  const session = await requireAdminSection(
    locale,
    'social-links',
    'view',
    `/${locale}/admin/social-links`,
  );
  const canManage = canManageSection(session, 'social-links');
  const query = await searchParams;
  const targetLocale = normalizeContentLocale(query.contentLocale);
  const linksResult = await getSocialLinks(targetLocale, noStoreApiFetchOptions)
    .then((links) => ({ links, error: false as const }))
    .catch(() => ({ links: [] as SocialLink[], error: true as const }));

  const hiddenCount = splitSocialLinksForRow(linksResult.links, maxSocialLinksInRow)
    .overflow.length;

  return (
    <AdminShell
      contentWidth="5xl"
      description="Кнопки соцсетей в шапке сайта и в полноэкранном меню. Набор задаётся отдельно для каждого языка — переключайте язык в верхней панели."
      title="Соцсети в шапке"
      stats={[
        { label: 'Язык', value: getContentLocaleLabel(targetLocale) },
        {
          label: 'Кнопок',
          value: `${linksResult.links.length} из ${maxSocialLinks}`,
          hint: linksResult.links.length
            ? hiddenCount > 0
              ? `В шапке видно ${linksResult.links.length - hiddenCount}, ещё ${hiddenCount} — в выпадающем списке`
              : 'Все кнопки помещаются в шапку'
            : 'Блок соцсетей сейчас не выводится',
        },
      ]}>
      <div className="space-y-4">
        {linksResult.error ? (
          <AdminNotice tone="error">
            Не удалось загрузить ссылки из backend. Редактор заблокирован, чтобы не перезаписать
            сохранённый набор пустым списком.
          </AdminNotice>
        ) : (
          <AdminPanel
            badge="Шапка сайта"
            title={`Соцсети ${getContentLocaleLabel(targetLocale)}`}
            description={
              canManage
                ? `Кнопка показывает иконку или короткий текст. Порядок в списке — порядок в шапке: ${maxSocialLinksInRow} кнопок встают в ряд целиком, а если их больше — первые ${maxSocialLinksInRow - 1} остаются в ряду и остальные открываются кнопкой «+N» рядом с ними. До ${maxSocialLinks} кнопок на язык.`
                : 'Просмотр набора кнопок. Для изменений нужен полный доступ к разделу.'
            }>
            <SocialLinksEditor
              key={targetLocale}
              adminLocale={locale}
              canManage={canManage}
              links={linksResult.links}
              targetLocale={targetLocale}
            />
          </AdminPanel>
        )}
      </div>
    </AdminShell>
  );
}
