import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';

export const UI_MESSAGE_LOCALES = ['ru', 'en', 'fr', 'es'] as const;
export type UiMessageLocale = (typeof UI_MESSAGE_LOCALES)[number];

export type UiMessageValue =
  string | UiMessageValue[] | { [key: string]: UiMessageValue };
export type UiMessageDocument = { [key: string]: UiMessageValue };

const MAX_PAYLOAD_BYTES = 256 * 1024;
const MAX_DEPTH = 20;
const MAX_NODES = 10_000;
const MAX_CONTAINER_ITEMS = 1_000;
const MAX_REVISION = 2_147_483_646;
const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);

function fail(message: string): never {
  throw new BadRequestException(message);
}

function assertPayloadSize(value: unknown) {
  let serialized: string;

  try {
    serialized = JSON.stringify(value);
  } catch {
    fail('Request body must be valid JSON');
  }

  if (typeof serialized !== 'string') {
    fail('Request body must be valid JSON');
  }
  if (Buffer.byteLength(serialized, 'utf8') > MAX_PAYLOAD_BYTES) {
    throw new PayloadTooLargeException('UI messages payload is too large');
  }
}

function assertPlainObject(
  value: unknown,
  message: string,
): asserts value is Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    fail(message);
  }
}

function assertAllowedKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
) {
  const keys = Reflect.ownKeys(value);

  if (
    keys.some((key) => typeof key !== 'string' || forbiddenKeys.has(key)) ||
    keys.length !== allowed.length ||
    keys.some((key) => typeof key === 'string' && !allowed.includes(key))
  ) {
    fail('Request body contains unsupported fields');
  }
}

function parseExpectedRevision(value: unknown) {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > MAX_REVISION
  ) {
    fail('expectedRevision must be a non-negative integer');
  }

  return value;
}

function validateDocument(value: unknown): UiMessageDocument {
  assertPlainObject(value, 'messages must be a JSON object');
  const seen = new Set<object>();
  let nodes = 0;

  const visit = (node: unknown, depth: number): UiMessageValue => {
    nodes += 1;
    if (nodes > MAX_NODES) {
      fail('UI messages contain too many elements');
    }
    if (depth > MAX_DEPTH) {
      fail('UI messages are nested too deeply');
    }
    if (typeof node === 'string') {
      return node;
    }
    if (!node || typeof node !== 'object') {
      fail('UI message leaves must be strings');
    }
    if (seen.has(node)) {
      fail('UI messages must not contain cycles');
    }
    seen.add(node);

    if (Array.isArray(node)) {
      if (Object.getPrototypeOf(node) !== Array.prototype) {
        fail('UI messages contain an unsupported array');
      }
      if (node.length > MAX_CONTAINER_ITEMS) {
        fail('UI message array is too large');
      }
      const keys = Object.keys(node);
      if (
        keys.length !== node.length ||
        keys.some(
          (key) =>
            !/^(0|[1-9]\d*)$/.test(key) ||
            Number.parseInt(key, 10) >= node.length,
        )
      ) {
        fail('UI message arrays must be dense');
      }
      const result = node.map((item) => visit(item, depth + 1));
      seen.delete(node);
      return result;
    }

    if (Object.getPrototypeOf(node) !== Object.prototype) {
      fail('UI messages contain an unsupported object');
    }
    const keys = Reflect.ownKeys(node);
    if (keys.length > MAX_CONTAINER_ITEMS) {
      fail('UI message object has too many properties');
    }
    if (keys.some((key) => typeof key !== 'string' || forbiddenKeys.has(key))) {
      fail('UI messages contain a forbidden key');
    }
    const result: Record<string, UiMessageValue> = {};
    for (const key of keys as string[]) {
      result[key] = visit((node as Record<string, unknown>)[key], depth + 1);
    }
    seen.delete(node);
    return result;
  };

  return visit(value, 0) as UiMessageDocument;
}

export function parseUiMessageLocale(value: string): UiMessageLocale {
  if (!UI_MESSAGE_LOCALES.includes(value as UiMessageLocale)) {
    throw new BadRequestException('Unsupported UI message locale');
  }

  return value as UiMessageLocale;
}

export function parseUiMessageWriteBody(body: unknown) {
  assertPayloadSize(body);
  assertPlainObject(body, 'Request body must be a JSON object');
  assertAllowedKeys(body, ['messages', 'expectedRevision']);

  return {
    messages: validateDocument(body.messages),
    expectedRevision: parseExpectedRevision(body.expectedRevision),
  };
}

export function parseUiMessageResetBody(body: unknown) {
  assertPayloadSize(body);
  assertPlainObject(body, 'Request body must be a JSON object');
  assertAllowedKeys(body, ['expectedRevision']);

  return {
    expectedRevision: parseExpectedRevision(body.expectedRevision),
  };
}
