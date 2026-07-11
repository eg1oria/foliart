import 'server-only';
import sanitizeHtml from 'sanitize-html';
import { generateHTML } from '@tiptap/html/server';
import { createArticleExtensions } from './articleContent';
import type { ArticleContentPayload } from './api';

const options: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'em',
    'u',
    'h2',
    'h3',
    'h4',
    'ul',
    'ol',
    'li',
    'blockquote',
    'a',
    'img',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowProtocolRelative: false,
  transformTags: {
    a: (_tag, attributes) => {
      const href = attributes.href?.trim() ?? '';
      const external = /^https?:\/\//i.test(href);
      return {
        tagName: 'a',
        attribs: href && !/^(?:javascript|data|vbscript):/i.test(href)
          ? {
              href,
              ...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {}),
            }
          : {},
      };
    },
    img: (_tag, attributes) => {
      const src = attributes.src?.trim() ?? '';
      const internal = /^\/media\/articles\/(?:content|media)\//i.test(src);
      return {
        tagName: 'img',
        attribs: internal
          ? {
              src,
              alt: attributes.alt?.trim() ?? '',
              ...(attributes.title?.trim() ? { title: attributes.title.trim() } : {}),
              ...(attributes.width && /^\d{1,5}$/.test(attributes.width) ? { width: attributes.width } : {}),
              ...(attributes.height && /^\d{1,5}$/.test(attributes.height) ? { height: attributes.height } : {}),
            }
          : {},
      };
    },
  },
  exclusiveFilter: (frame) =>
    (frame.tag === 'a' && !frame.attribs.href) || (frame.tag === 'img' && !frame.attribs.src),
};

export function renderArticleContent(payload: ArticleContentPayload | undefined, legacyHtml = '') {
  const html =
    payload?.format === 'tiptap-json'
      ? generateHTML(payload.document, createArticleExtensions(false))
      : payload?.format === 'legacy-html'
        ? payload.html
        : legacyHtml;
  return sanitizeHtml(html, options).trim();
}
