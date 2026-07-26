import {
  TYPE,
  parse,
  type MessageFormatElement,
} from '@formatjs/icu-messageformat-parser';
import {
  formatUiMessagePath,
  getUiMessagePathId,
  normalizeUiMessageDocument,
  type UiMessageDocument,
  type UiMessagePath,
  type UiMessageValue,
} from './uiMessages';

export type UiMessagesValidationResult =
  | { ok: true; messages: UiMessageDocument }
  | {
      ok: false;
      message: string;
      fieldErrors: Record<string, string>;
    };

function getIcuSignature(elements: MessageFormatElement[]) {
  const signatures: string[] = [];

  const visit = (items: MessageFormatElement[]) => {
    for (const element of items) {
      if (
        element.type === TYPE.argument ||
        element.type === TYPE.number ||
        element.type === TYPE.date ||
        element.type === TYPE.time
      ) {
        signatures.push(`${TYPE[element.type]}:${element.value}`);
      } else if (
        element.type === TYPE.plural ||
        element.type === TYPE.select
      ) {
        signatures.push(
          `${TYPE[element.type]}:${element.value}:${Object.keys(element.options)
            .sort()
            .join(',')}${
            element.type === TYPE.plural
              ? `:offset=${element.offset}:pluralType=${element.pluralType}`
              : ''
          }`,
        );
        Object.values(element.options).forEach((option) => visit(option.value));
      } else if (element.type === TYPE.tag) {
        signatures.push(`tag:${element.value}`);
        visit(element.children);
      }
    }
  };

  visit(elements);
  return signatures.sort();
}

function validateIcuValue(reference: string, candidate: string) {
  try {
    const referenceSignature = getIcuSignature(
      parse(reference, { ignoreTag: false }),
    );
    const candidateSignature = getIcuSignature(
      parse(candidate, { ignoreTag: false }),
    );

    if (
      JSON.stringify(referenceSignature) !==
      JSON.stringify(candidateSignature)
    ) {
      return 'Сохраните исходные ICU-параметры и rich-text теги.';
    }
  } catch {
    return 'Исправьте ICU-синтаксис или незакрытый rich-text тег.';
  }

  return null;
}

export function validateEditableUiMessages(
  reference: UiMessageDocument,
  candidate: unknown,
): UiMessagesValidationResult {
  const normalized = normalizeUiMessageDocument(candidate);
  if (!normalized) {
    return {
      ok: false,
      message: 'Документ переводов имеет недопустимый JSON-формат.',
      fieldErrors: {},
    };
  }

  const fieldErrors: Record<string, string> = {};

  const visit = (
    expected: UiMessageValue,
    actual: UiMessageValue | undefined,
    path: UiMessagePath,
  ) => {
    const id = getUiMessagePathId(path);
    const key = formatUiMessagePath(path) || 'messages';

    if (typeof expected === 'string') {
      if (typeof actual !== 'string') {
        fieldErrors[id] = `Строка ${key} отсутствует или имеет неверный тип.`;
        return;
      }
      const icuError = validateIcuValue(expected, actual);
      if (icuError) fieldErrors[id] = icuError;
      return;
    }

    if (Array.isArray(expected)) {
      if (!Array.isArray(actual) || actual.length !== expected.length) {
        fieldErrors[id] = `Массив ${key} должен сохранить исходную длину.`;
        return;
      }
      expected.forEach((item, index) =>
        visit(item, actual[index], [...path, index]),
      );
      return;
    }

    if (
      !actual ||
      typeof actual !== 'object' ||
      Array.isArray(actual)
    ) {
      fieldErrors[id] = `Раздел ${key} отсутствует или имеет неверный тип.`;
      return;
    }
    const expectedKeys = Object.keys(expected).sort();
    const actualKeys = Object.keys(actual).sort();
    if (JSON.stringify(expectedKeys) !== JSON.stringify(actualKeys)) {
      fieldErrors[id] = `Раздел ${key} должен сохранить исходный набор ключей.`;
      return;
    }
    for (const childKey of expectedKeys) {
      visit(
        expected[childKey],
        (actual as Record<string, UiMessageValue>)[childKey],
        [...path, childKey],
      );
    }
  };

  visit(reference, normalized, []);
  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: 'Исправьте отмеченные строки перед сохранением.',
      fieldErrors,
    };
  }

  return { ok: true, messages: normalized };
}
