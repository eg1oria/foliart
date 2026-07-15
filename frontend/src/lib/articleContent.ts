import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';
import { Node, mergeAttributes, type JSONContent } from '@tiptap/core';

export type ArticleDocument = JSONContent;

export const EMPTY_ARTICLE_DOCUMENT: ArticleDocument = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

const internalArticleImagePattern =
  /^\/media\/articles\/(?:media\/[0-9a-f-]+\/(?:original\.(?:webp|gif)|preview\.webp)|content\/[a-z0-9-]+\.webp)$/i;

export function isInternalArticleImageSource(value: unknown): value is string {
  return typeof value === 'string' && internalArticleImagePattern.test(value.trim());
}

export function sanitizeArticleDocumentImages(document: ArticleDocument) {
  let removedImages = 0;

  const visit = (node: ArticleDocument): ArticleDocument => {
    if (node.type === 'image' && !isInternalArticleImageSource(node.attrs?.src)) {
      removedImages += 1;
      return { type: 'paragraph' };
    }

    return {
      ...node,
      ...(node.content ? { content: node.content.map(visit) } : {}),
    };
  };

  return { document: visit(document), removedImages };
}

export const ArticleImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      mediaId: { default: null, rendered: false },
      width: { default: null },
      height: { default: null },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: (element) =>
          isInternalArticleImageSource(element.getAttribute('src')) ? {} : false,
      },
    ];
  },
});

export const ArticleImageUpload = Node.create({
  name: 'imageUpload',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,
  addAttributes() {
    return { uploadId: { default: null }, alt: { default: '' } };
  },
  parseHTML() {
    return [{ tag: 'div[data-article-image-upload]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-article-image-upload': '',
        class: 'article-image-upload-placeholder',
        role: 'status',
      }),
      'Изображение загружается…',
    ];
  },
});

export function createArticleExtensions(includeUploadNode = false) {
  return [
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
    ArticleImage.configure({ allowBase64: false, inline: false }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      defaultProtocol: 'https',
      HTMLAttributes: { rel: 'noreferrer noopener', target: '_blank' },
    }),
    ...(includeUploadNode ? [ArticleImageUpload] : []),
  ];
}

export function hasPendingUploads(document: ArticleDocument) {
  let pending = false;
  const visit = (node: ArticleDocument) => {
    if (node.type === 'imageUpload') pending = true;
    node.content?.forEach(visit);
  };
  visit(document);
  return pending;
}
