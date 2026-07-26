import enMessages from '../../messages/en.json';
import esMessages from '../../messages/es.json';
import frMessages from '../../messages/fr.json';
import ruMessages from '../../messages/ru.json';

export const uiMessageLocales = ['ru', 'en', 'fr', 'es'] as const;
export type UiMessageLocale = (typeof uiMessageLocales)[number];

export type UiMessageValue =
  | string
  | UiMessageValue[]
  | { [key: string]: UiMessageValue };
export type UiMessageDocument = { [key: string]: UiMessageValue };
export type UiMessagePath = Array<string | number>;

export type UiMessageEntry = {
  id: string;
  key: string;
  path: UiMessagePath;
  section: string;
  value: string;
};

export type UiMessagesApiResponse = {
  locale: UiMessageLocale;
  messages: UiMessageDocument | null;
  revision: number;
  updatedAt: string | null;
};

const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);
const MAX_DEPTH = 20;
const MAX_NODES = 10_000;
const MAX_CONTAINER_ITEMS = 1_000;

const bundledMessages = {
  ru: ruMessages,
  en: enMessages,
  fr: frMessages,
  es: esMessages,
} satisfies Record<UiMessageLocale, UiMessageDocument>;

export function isUiMessageLocale(value: unknown): value is UiMessageLocale {
  return (
    typeof value === 'string' &&
    uiMessageLocales.includes(value as UiMessageLocale)
  );
}

export function getBundledUiMessages(locale: UiMessageLocale) {
  return bundledMessages[locale] as UiMessageDocument;
}

export function getUiMessagesTag(locale: UiMessageLocale) {
  return `ui-messages:${locale}`;
}

export function getUiMessagePathId(path: UiMessagePath) {
  return JSON.stringify(path);
}

export function formatUiMessagePath(path: UiMessagePath) {
  return path.map(String).join('.');
}

export function flattenUiMessages(
  value: UiMessageValue,
  path: UiMessagePath = [],
  result: UiMessageEntry[] = [],
) {
  if (typeof value === 'string') {
    result.push({
      id: getUiMessagePathId(path),
      key: formatUiMessagePath(path),
      path,
      section: String(path[0] ?? 'other'),
      value,
    });
    return result;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      flattenUiMessages(item, [...path, index], result),
    );
    return result;
  }

  Object.entries(value).forEach(([key, item]) =>
    flattenUiMessages(item, [...path, key], result),
  );
  return result;
}

export function rebuildUiMessages(
  template: UiMessageValue,
  values: Readonly<Record<string, string>>,
  path: UiMessagePath = [],
): UiMessageValue {
  if (typeof template === 'string') {
    return values[getUiMessagePathId(path)] ?? template;
  }
  if (Array.isArray(template)) {
    return template.map((item, index) =>
      rebuildUiMessages(item, values, [...path, index]),
    );
  }

  return Object.fromEntries(
    Object.entries(template).map(([key, item]) => [
      key,
      rebuildUiMessages(item, values, [...path, key]),
    ]),
  );
}

export function mergeUiMessages(
  bundled: UiMessageValue,
  override: unknown,
): UiMessageValue {
  if (typeof bundled === 'string') {
    return typeof override === 'string' ? override : bundled;
  }
  if (Array.isArray(bundled)) {
    const overrideItems = Array.isArray(override) ? override : [];
    return bundled.map((item, index) =>
      mergeUiMessages(item, overrideItems[index]),
    );
  }

  const overrideObject =
    override &&
    typeof override === 'object' &&
    !Array.isArray(override) &&
    Object.getPrototypeOf(override) === Object.prototype
      ? (override as Record<string, unknown>)
      : {};

  return Object.fromEntries(
    Object.entries(bundled).map(([key, item]) => [
      key,
      mergeUiMessages(
        item,
        Object.prototype.hasOwnProperty.call(overrideObject, key)
          ? overrideObject[key]
          : undefined,
      ),
    ]),
  );
}

export function resolveUiMessages(
  locale: UiMessageLocale,
  stored: UiMessagesApiResponse | null,
) {
  return mergeUiMessages(
    getBundledUiMessages(locale),
    stored?.messages,
  ) as UiMessageDocument;
}

export function normalizeUiMessageDocument(
  value: unknown,
): UiMessageDocument | null {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return null;
  }

  const seen = new Set<object>();
  let nodes = 0;

  const visit = (node: unknown, depth: number): UiMessageValue | null => {
    nodes += 1;
    if (nodes > MAX_NODES || depth > MAX_DEPTH) return null;
    if (typeof node === 'string') return node;
    if (!node || typeof node !== 'object' || seen.has(node)) return null;
    seen.add(node);

    if (Array.isArray(node)) {
      if (
        Object.getPrototypeOf(node) !== Array.prototype ||
        node.length > MAX_CONTAINER_ITEMS ||
        Object.keys(node).length !== node.length
      ) {
        return null;
      }
      const result: UiMessageValue[] = [];
      for (const item of node) {
        const normalized = visit(item, depth + 1);
        if (normalized === null) return null;
        result.push(normalized);
      }
      seen.delete(node);
      return result;
    }

    if (Object.getPrototypeOf(node) !== Object.prototype) return null;
    const keys = Reflect.ownKeys(node);
    if (
      keys.length > MAX_CONTAINER_ITEMS ||
      keys.some((key) => typeof key !== 'string' || forbiddenKeys.has(key))
    ) {
      return null;
    }
    const entries: Array<[string, UiMessageValue]> = [];
    for (const key of keys as string[]) {
      const normalized = visit(
        (node as Record<string, unknown>)[key],
        depth + 1,
      );
      if (normalized === null) return null;
      entries.push([key, normalized]);
    }
    seen.delete(node);
    return Object.fromEntries(entries);
  };

  return visit(value, 0) as UiMessageDocument | null;
}

export function parseUiMessagesApiResponse(
  value: unknown,
  expectedLocale: UiMessageLocale,
): UiMessagesApiResponse | null {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (
    record.locale !== expectedLocale ||
    typeof record.revision !== 'number' ||
    !Number.isSafeInteger(record.revision) ||
    record.revision < 0 ||
    !(
      record.updatedAt === null ||
      (typeof record.updatedAt === 'string' &&
        Number.isFinite(Date.parse(record.updatedAt)))
    )
  ) {
    return null;
  }
  const messages =
    record.messages === null
      ? null
      : normalizeUiMessageDocument(record.messages);
  if (record.messages !== null && messages === null) return null;

  return {
    locale: expectedLocale,
    messages,
    revision: record.revision,
    updatedAt: record.updatedAt as string | null,
  };
}

for (const locale of uiMessageLocales) {
  if (!normalizeUiMessageDocument(bundledMessages[locale])) {
    throw new Error(`Bundled UI messages are invalid for locale ${locale}`);
  }
}
