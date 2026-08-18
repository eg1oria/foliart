'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { getAdminApiHeaders } from '@/lib/adminApi';
import {
  adminApiFetch,
  getAdminApiErrorMessage,
} from '@/lib/adminBackend';
import { isSupportedAdminLocale } from '@/lib/adminAuth';
import { requireAdminSection } from '@/lib/adminAuthServer';
import {
  getBundledUiMessages,
  getUiMessagesTag,
  isUiMessageLocale,
  parseUiMessagesApiResponse,
  type UiMessageLocale,
  type UiMessagesApiResponse,
} from '@/i18n/uiMessages';
import { validateEditableUiMessages } from '@/i18n/uiMessagesValidation';
import { primeUiMessagesLastKnownGood } from '@/i18n/uiMessagesServer';

const MAX_PAYLOAD_BYTES = 256 * 1024;

export type UiMessagesActionInput = {
  adminLocale: string;
  expectedRevision: number;
  messages: unknown;
  targetLocale: string;
};

export type UiMessagesResetInput = Omit<UiMessagesActionInput, 'messages'>;

export type UiMessagesActionState = {
  fieldErrors?: Record<string, string>;
  message?: string;
  revision?: number;
  status: 'idle' | 'success' | 'error' | 'conflict';
  updatedAt?: string | null;
};

function getAdminLocale(value: string) {
  return isSupportedAdminLocale(value) ? value : 'ru';
}

function parseMutationInput(input: {
  adminLocale: string;
  expectedRevision: number;
  targetLocale: string;
}) {
  const adminLocale = getAdminLocale(input.adminLocale);
  if (!isUiMessageLocale(input.targetLocale)) {
    return {
      error: 'Выбран неподдерживаемый язык переводов.',
      adminLocale,
    } as const;
  }
  if (
    !Number.isSafeInteger(input.expectedRevision) ||
    input.expectedRevision < 0
  ) {
    return {
      error: 'Некорректная версия переводов. Перезагрузите страницу.',
      adminLocale,
    } as const;
  }

  return {
    adminLocale,
    expectedRevision: input.expectedRevision,
    targetLocale: input.targetLocale,
  } as const;
}

function isPayloadTooLarge(value: unknown) {
  try {
    return (
      new TextEncoder().encode(JSON.stringify(value)).byteLength >
      MAX_PAYLOAD_BYTES
    );
  } catch {
    return true;
  }
}

async function getMutationError(response: Response, adminLocale: string) {
  return (
    (await getAdminApiErrorMessage(response, adminLocale)) ||
    'Не удалось сохранить переводы.'
  );
}

function refreshUiMessages(
  locale: UiMessageLocale,
  response: UiMessagesApiResponse,
) {
  primeUiMessagesLastKnownGood(locale, response);
  updateTag(getUiMessagesTag(locale));
  revalidatePath(`/${locale}`, 'layout');
}

export async function saveUiMessagesAction(
  _previousState: UiMessagesActionState,
  input: UiMessagesActionInput,
): Promise<UiMessagesActionState> {
  const parsedInput = parseMutationInput(input);
  await requireAdminSection(parsedInput.adminLocale, 'messages', 'manage');

  if ('error' in parsedInput) {
    return { status: 'error', message: parsedInput.error };
  }
  const { expectedRevision, targetLocale } = parsedInput;
  const payload = {
    expectedRevision,
    messages: input.messages,
  };
  if (isPayloadTooLarge(payload)) {
    return {
      status: 'error',
      message: 'Документ переводов превышает лимит 256 КиБ.',
    };
  }
  const validation = validateEditableUiMessages(
    getBundledUiMessages(targetLocale),
    input.messages,
  );
  if (!validation.ok) {
    return {
      status: 'error',
      message: validation.message,
      fieldErrors: validation.fieldErrors,
    };
  }

  const response = await adminApiFetch(
    `/api/ui-messages/${targetLocale}`,
    {
      method: 'PUT',
      headers: {
        ...getAdminApiHeaders(),
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        expectedRevision,
        messages: validation.messages,
      }),
    },
  );

  if (response.status === 409) {
    return {
      status: 'conflict',
      message:
        'Переводы уже изменены в другой сессии. Перезагрузите актуальную версию.',
    };
  }
  if (!response.ok) {
    return {
      status: 'error',
      message: await getMutationError(response, parsedInput.adminLocale),
    };
  }

  const result = parseUiMessagesApiResponse(
    await response.json().catch(() => null),
    targetLocale,
  );
  if (
    !result ||
    result.messages === null ||
    result.revision !== expectedRevision + 1
  ) {
    return {
      status: 'error',
      message: 'Backend вернул некорректный ответ. Обновление кеша отменено.',
    };
  }

  refreshUiMessages(targetLocale, result);
  return {
    status: 'success',
    message: 'Переводы сохранены и кеш сайта обновлён.',
    revision: result.revision,
    updatedAt: result.updatedAt,
  };
}

export async function resetUiMessagesAction(
  _previousState: UiMessagesActionState,
  input: UiMessagesResetInput,
): Promise<UiMessagesActionState> {
  const parsedInput = parseMutationInput(input);
  await requireAdminSection(parsedInput.adminLocale, 'messages', 'manage');

  if ('error' in parsedInput) {
    return { status: 'error', message: parsedInput.error };
  }
  const { expectedRevision, targetLocale } = parsedInput;
  const response = await adminApiFetch(
    `/api/ui-messages/${targetLocale}`,
    {
      method: 'DELETE',
      headers: {
        ...getAdminApiHeaders(),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ expectedRevision }),
    },
  );

  if (response.status === 409) {
    return {
      status: 'conflict',
      message:
        'Переводы уже изменены в другой сессии. Перезагрузите актуальную версию.',
    };
  }
  if (!response.ok) {
    return {
      status: 'error',
      message: await getMutationError(response, parsedInput.adminLocale),
    };
  }

  const result = parseUiMessagesApiResponse(
    await response.json().catch(() => null),
    targetLocale,
  );
  if (
    !result ||
    result.messages !== null ||
    result.revision !== expectedRevision + 1
  ) {
    return {
      status: 'error',
      message: 'Backend вернул некорректный ответ. Обновление кеша отменено.',
    };
  }

  refreshUiMessages(targetLocale, result);
  return {
    status: 'success',
    message: 'Язык сброшен к встроенной версии, кеш сайта обновлён.',
    revision: result.revision,
    updatedAt: result.updatedAt,
  };
}
