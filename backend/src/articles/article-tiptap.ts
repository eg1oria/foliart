import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';
import { generateHTML, generateJSON } from '@tiptap/html/server';
import type { JSONContent } from '@tiptap/core';

export const articleTiptapExtensions = [
  StarterKit.configure({
    heading: { levels: [2, 3, 4] },
    code: false,
    codeBlock: false,
    strike: false,
    horizontalRule: false,
    link: false,
    underline: false,
  }),
  Underline,
  Image.configure({ allowBase64: false, inline: false }),
  Link.configure({
    openOnClick: false,
    autolink: false,
    defaultProtocol: 'https',
  }),
];

export function articleHtmlToJson(html: string) {
  return generateJSON(html, articleTiptapExtensions) as JSONContent;
}

export function articleJsonToHtml(document: JSONContent) {
  return generateHTML(document, articleTiptapExtensions);
}
