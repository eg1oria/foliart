export type ContactFormType = 'contact' | 'callback' | 'question';

export type ContactRequestPayload = {
  name: string;
  phone?: string;
  email?: string;
  comment?: string;
  formType: ContactFormType;
  pageUrl?: string;
  consent: boolean;
};

export const phoneInputMaxLength = 25;
export const phoneInputPattern = '[+0-9.\\(\\)\\s\\-]{6,25}';

function getContactApiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_URL?.trim() || '/api').replace(/\/$/, '');
}

export function getContactFormValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

export function sanitizePhoneInput(value: string) {
  return value.replace(/[^\d+().\s-]/g, '').replace(/(?!^)\+/g, '');
}

export async function sendContactRequest(payload: ContactRequestPayload) {
  const response = await fetch(`${getContactApiBaseUrl()}/contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error('Failed to send contact request');
  }
}
