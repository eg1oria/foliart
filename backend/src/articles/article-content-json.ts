import { BadRequestException } from '@nestjs/common';
import type { JSONContent } from '@tiptap/core';

export const ARTICLE_CONTENT_SCHEMA_VERSION = 1;
export const EMPTY_ARTICLE_DOCUMENT: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

const maxDocumentBytes = 1024 * 1024;
const maxNodes = 10_000;
const maxDepth = 20;
const maxTextLength = 500_000;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const internalImagePattern =
  /^\/media\/articles\/(?:media\/[0-9a-f-]+\/(?:original\.(?:webp|gif)|preview\.webp)|content\/[a-z0-9-]+\.webp)$/i;

type JsonRecord = Record<string, unknown>;
type NormalizeOptions = {
  allowPendingUploads?: boolean;
};

function fail(message: string): never {
  throw new BadRequestException(`Invalid article content: ${message}`);
}

function asRecord(value: unknown, path: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${path} must be an object`);
  }
  return value as JsonRecord;
}

function assertKeys(record: JsonRecord, allowed: string[], path: string) {
  const unexpected = Object.keys(record).find((key) => !allowed.includes(key));
  if (unexpected) fail(`${path}.${unexpected} is not allowed`);
}

function optionalString(value: unknown, path: string, max = 300) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') fail(`${path} must be a string`);
  if (value.length > max) fail(`${path} is too long`);
  return value.trim();
}

function isSafeLink(value: string) {
  if (value.startsWith('//') || /^(?:javascript|data|vbscript):/i.test(value)) {
    return false;
  }
  return (
    /^(?:https?:|mailto:|tel:)/i.test(value) ||
    value.startsWith('/') ||
    value.startsWith('#')
  );
}

function normalizeMarks(value: unknown, path: string) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) fail(`${path} must be an array`);

  return value.map((entry, index) => {
    const mark = asRecord(entry, `${path}[${index}]`);
    assertKeys(mark, ['type', 'attrs'], `${path}[${index}]`);
    if (!['bold', 'italic', 'underline', 'link'].includes(String(mark.type))) {
      fail(`${path}[${index}].type is not allowed`);
    }
    if (mark.type !== 'link') {
      if (
        mark.attrs !== undefined &&
        Object.keys(asRecord(mark.attrs, `${path}[${index}].attrs`)).length
      ) {
        fail(`${path}[${index}].attrs must be empty`);
      }
      return { type: mark.type as string };
    }

    const attrs = asRecord(mark.attrs, `${path}[${index}].attrs`);
    assertKeys(
      attrs,
      ['href', 'target', 'rel', 'class', 'title'],
      `${path}[${index}].attrs`,
    );
    const href = optionalString(
      attrs.href,
      `${path}[${index}].attrs.href`,
      2048,
    );
    if (!href || !isSafeLink(href))
      fail(`${path}[${index}].attrs.href is unsafe`);
    return { type: 'link', attrs: { href } };
  });
}

export function normalizeArticleDocument(
  value: unknown,
  options: NormalizeOptions = {},
): JSONContent {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    fail('document is not serializable');
  }
  if (Buffer.byteLength(serialized) > maxDocumentBytes)
    fail('document is too large');

  let nodeCount = 0;
  let textLength = 0;

  const visit = (
    raw: unknown,
    path: string,
    depth: number,
    parent?: string,
  ): JSONContent => {
    if (depth > maxDepth) fail('document is nested too deeply');
    nodeCount += 1;
    if (nodeCount > maxNodes) fail('document contains too many nodes');

    const node = asRecord(raw, path);
    assertKeys(node, ['type', 'attrs', 'content', 'text', 'marks'], path);
    const type =
      typeof node.type === 'string'
        ? node.type
        : fail(`${path}.type is required`);
    const allowed = [
      'doc',
      'paragraph',
      'text',
      'heading',
      'bulletList',
      'orderedList',
      'listItem',
      'blockquote',
      'hardBreak',
      'image',
      ...(options.allowPendingUploads ? ['imageUpload'] : []),
    ];
    if (!allowed.includes(type)) fail(`${path}.type "${type}" is not allowed`);
    if (path === 'document' && type !== 'doc') fail('root node must be doc');
    if (path !== 'document' && type === 'doc')
      fail('doc can only be the root node');

    if (type === 'text') {
      if (!['paragraph', 'heading'].includes(parent ?? '')) {
        fail(`${path} is not valid inside ${parent}`);
      }
      if (typeof node.text !== 'string' || !node.text)
        fail(`${path}.text is required`);
      textLength += node.text.length;
      if (textLength > maxTextLength) fail('document text is too long');
      return {
        type,
        text: node.text,
        marks: normalizeMarks(node.marks, `${path}.marks`),
      };
    }

    if (node.text !== undefined || node.marks !== undefined) {
      fail(`${path} cannot contain text or marks`);
    }

    if (type === 'hardBreak') {
      if (!['paragraph', 'heading'].includes(parent ?? ''))
        fail(`${path} has an invalid parent`);
      if (node.attrs !== undefined || node.content !== undefined)
        fail(`${path} cannot have attrs or content`);
      return { type };
    }

    if (type === 'image') {
      if (!['doc', 'listItem', 'blockquote'].includes(parent ?? ''))
        fail(`${path} has an invalid parent`);
      const attrs = asRecord(node.attrs, `${path}.attrs`);
      assertKeys(
        attrs,
        ['mediaId', 'src', 'alt', 'title', 'width', 'height'],
        `${path}.attrs`,
      );
      const mediaId = optionalString(
        attrs.mediaId,
        `${path}.attrs.mediaId`,
        64,
      );
      const src = optionalString(attrs.src, `${path}.attrs.src`, 512);
      if (mediaId && !uuidPattern.test(mediaId))
        fail(`${path}.attrs.mediaId is invalid`);
      if (!src || !internalImagePattern.test(src))
        fail(`${path}.attrs.src must be an internal media URL`);
      const width =
        attrs.width === undefined || attrs.width === null
          ? undefined
          : Number(attrs.width);
      const height =
        attrs.height === undefined || attrs.height === null
          ? undefined
          : Number(attrs.height);
      if (
        width !== undefined &&
        (!Number.isInteger(width) || width < 1 || width > 20_000)
      )
        fail(`${path}.attrs.width is invalid`);
      if (
        height !== undefined &&
        (!Number.isInteger(height) || height < 1 || height > 20_000)
      )
        fail(`${path}.attrs.height is invalid`);
      return {
        type,
        attrs: {
          ...(mediaId ? { mediaId } : {}),
          src,
          alt: optionalString(attrs.alt, `${path}.attrs.alt`) ?? '',
          ...(optionalString(attrs.title, `${path}.attrs.title`)
            ? { title: optionalString(attrs.title, `${path}.attrs.title`) }
            : {}),
          ...(width ? { width } : {}),
          ...(height ? { height } : {}),
        },
      };
    }

    if (type === 'imageUpload') {
      const attrs = asRecord(node.attrs, `${path}.attrs`);
      assertKeys(attrs, ['uploadId', 'alt'], `${path}.attrs`);
      const uploadId = optionalString(
        attrs.uploadId,
        `${path}.attrs.uploadId`,
        64,
      );
      if (!uploadId || !uuidPattern.test(uploadId))
        fail(`${path}.attrs.uploadId is invalid`);
      return {
        type,
        attrs: {
          uploadId,
          alt: optionalString(attrs.alt, `${path}.attrs.alt`) ?? '',
        },
      };
    }

    let attrs: JsonRecord | undefined;
    if (type === 'heading') {
      const rawAttrs = asRecord(node.attrs, `${path}.attrs`);
      assertKeys(rawAttrs, ['level'], `${path}.attrs`);
      const level = Number(rawAttrs.level);
      if (![2, 3, 4].includes(level))
        fail(`${path}.attrs.level must be 2, 3, or 4`);
      attrs = { level };
    } else if (type === 'orderedList') {
      const rawAttrs =
        node.attrs === undefined ? {} : asRecord(node.attrs, `${path}.attrs`);
      assertKeys(rawAttrs, ['start', 'type'], `${path}.attrs`);
      const start =
        rawAttrs.start === undefined || rawAttrs.start === null
          ? 1
          : Number(rawAttrs.start);
      if (!Number.isInteger(start) || start < 1 || start > 9999)
        fail(`${path}.attrs.start is invalid`);
      attrs = { start };
    } else if (node.attrs !== undefined) {
      const rawAttrs = asRecord(node.attrs, `${path}.attrs`);
      const allowedDefaultAttrs = type === 'bulletList' ? ['type'] : [];
      assertKeys(rawAttrs, allowedDefaultAttrs, `${path}.attrs`);
    }

    const content = node.content === undefined ? [] : node.content;
    if (!Array.isArray(content)) fail(`${path}.content must be an array`);
    const children = content.map((child, index) =>
      visit(child, `${path}.content[${index}]`, depth + 1, type),
    );

    const childTypes = children.map((child) => child.type);
    if (
      type === 'doc' &&
      childTypes.some(
        (child) =>
          ![
            'paragraph',
            'heading',
            'bulletList',
            'orderedList',
            'blockquote',
            'image',
            'imageUpload',
          ].includes(child ?? ''),
      )
    )
      fail(`${path} contains an invalid block`);
    if (
      ['paragraph', 'heading'].includes(type) &&
      childTypes.some((child) => !['text', 'hardBreak'].includes(child ?? ''))
    )
      fail(`${path} contains invalid inline content`);
    if (
      ['bulletList', 'orderedList'].includes(type) &&
      childTypes.some((child) => child !== 'listItem')
    )
      fail(`${path} can only contain listItem nodes`);
    if (
      type === 'listItem' &&
      childTypes.some(
        (child) =>
          ![
            'paragraph',
            'heading',
            'bulletList',
            'orderedList',
            'blockquote',
            'image',
            'imageUpload',
          ].includes(child ?? ''),
      )
    )
      fail(`${path} contains an invalid list block: ${childTypes.join(', ')}`);
    if (
      type === 'blockquote' &&
      childTypes.some(
        (child) =>
          ![
            'paragraph',
            'heading',
            'bulletList',
            'orderedList',
            'image',
            'imageUpload',
          ].includes(child ?? ''),
      )
    )
      fail(`${path} contains an invalid quote block`);

    return {
      type,
      ...(attrs ? { attrs } : {}),
      ...(children.length ? { content: children } : {}),
    };
  };

  return visit(value, 'document', 0);
}

export function getArticleDocumentText(document: JSONContent) {
  const chunks: string[] = [];
  const visit = (node: JSONContent) => {
    if (node.text) chunks.push(node.text);
    node.content?.forEach(visit);
    if (
      ['paragraph', 'heading', 'listItem', 'blockquote'].includes(
        node.type ?? '',
      )
    )
      chunks.push(' ');
  };
  visit(document);
  return chunks.join('').replace(/\s+/g, ' ').trim();
}

export function getArticleDocumentMediaIds(document: JSONContent) {
  const ids = new Set<string>();
  const visit = (node: JSONContent) => {
    if (node.type === 'image' && typeof node.attrs?.mediaId === 'string')
      ids.add(node.attrs.mediaId);
    node.content?.forEach(visit);
  };
  visit(document);
  return ids;
}

export function hasPendingArticleUploads(document: JSONContent) {
  let pending = false;
  const visit = (node: JSONContent) => {
    if (node.type === 'imageUpload') pending = true;
    node.content?.forEach(visit);
  };
  visit(document);
  return pending;
}
