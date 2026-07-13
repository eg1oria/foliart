import 'server-only';
import sanitizeHtml from 'sanitize-html';

import {
  plainTextToRichDescriptionHtml,
  richDescriptionToPlainText,
} from './richDescription';

const richDescriptionOptions: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong'],
  allowedAttributes: {},
  transformTags: {
    b: 'strong',
    div: 'p',
  },
};

export function sanitizeRichDescription(value: string) {
  const normalized = value.replace(/\r\n?/g, '\n').trim();
  if (!normalized) return '';

  const prepared = /<\/?[a-z][^>]*>/i.test(normalized)
    ? normalized
    : plainTextToRichDescriptionHtml(normalized);
  const sanitized = sanitizeHtml(prepared, richDescriptionOptions).trim();

  return richDescriptionToPlainText(sanitized) ? sanitized : '';
}

export const renderRichDescription = sanitizeRichDescription;
