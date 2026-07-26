import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import { isUiMessageLocale } from './uiMessages';
import { getEffectiveUiMessages } from './uiMessagesServer';

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const locale = isUiMessageLocale(requestedLocale)
    ? requestedLocale
    : routing.defaultLocale;

  return {
    locale,
    messages: await getEffectiveUiMessages(locale),
  };
});
