import sanitizeHtml, { type IFrame, type IOptions } from 'sanitize-html';

const excerptMaxLength = 220;
const plainTextOnlyOptions: IOptions = {
  allowedTags: [],
  allowedAttributes: {},
};

const articleHtmlOptions: IOptions = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'em',
    'u',
    'h2',
    'h3',
    'ul',
    'ol',
    'li',
    'blockquote',
    'a',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  transformTags: {
    b: 'strong',
    i: 'em',
    div: 'p',
    h1: 'h2',
    h4: 'h3',
    h5: 'h3',
    h6: 'h3',
    a: (_tagName, attribs) => {
      const href = typeof attribs.href === 'string' ? attribs.href.trim() : '';

      const isExternal = /^https?:\/\//i.test(href);

      return {
        tagName: 'a',
        attribs: {
          href,
          ...(isExternal
            ? {
                target: '_blank',
                rel: 'noreferrer noopener',
              }
            : {}),
        },
      };
    },
  },
  exclusiveFilter: (frame: IFrame) => frame.tag === 'a' && !frame.attribs.href,
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizePlainText(value: string) {
  return value.replace(/\r\n?/g, '\n').trim();
}

function wrapPlainTextAsParagraphs(value: string) {
  return value
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

function collapseSpacing(value: string) {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function truncateExcerpt(value: string) {
  if (value.length <= excerptMaxLength) {
    return value;
  }

  return `${value.slice(0, excerptMaxLength - 3).trimEnd()}...`;
}

export function stripHtmlToText(value: string) {
  return collapseSpacing(sanitizeHtml(value, plainTextOnlyOptions));
}

export function sanitizeArticleContent(value: string) {
  const normalized = normalizePlainText(value);

  if (!stripHtmlToText(normalized)) {
    return '';
  }

  const preparedValue = /<\/?[a-z][\s\S]*>/i.test(normalized)
    ? normalized
    : wrapPlainTextAsParagraphs(normalized);

  return sanitizeHtml(preparedValue, articleHtmlOptions).trim();
}

export function sanitizeArticleExcerpt(excerpt: string, content: string) {
  const normalizedExcerpt = collapseSpacing(
    sanitizeHtml(excerpt, plainTextOnlyOptions),
  );

  if (normalizedExcerpt) {
    return truncateExcerpt(normalizedExcerpt);
  }

  const contentText = stripHtmlToText(content);

  return contentText ? truncateExcerpt(contentText) : '';
}
