// TODO: временный хелпер — убрать когда next-intl заработает с Next.js 16
// Читает напрямую из ru.json, не нужен провайдер или middleware
import ruMessages from '../../messages/ru.json';

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const result = path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
  return typeof result === 'string' ? result : path;
}

export function useTranslations(namespace: string) {
  const namespaceObj =
    ((ruMessages as Record<string, unknown>)[namespace] as Record<string, unknown>) ?? {};
  return function t(key: string): string {
    return getNestedValue(namespaceObj, key);
  };
}

export function useLocale(): string {
  return 'ru';
}
