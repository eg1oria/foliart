'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import {
  getContactFormValue,
  phoneInputMaxLength,
  phoneInputPattern,
  sanitizePhoneInput,
  sendContactRequest,
} from '@/lib/contact';

type SubmitStatus = 'idle' | 'sending' | 'success' | 'error';

export default function ContactForm() {
  const [agreed, setAgreed] = useState(true);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const t = useTranslations('ContactForm');
  const isSending = submitStatus === 'sending';

  const handlePhoneInput = (event: FormEvent<HTMLInputElement>) => {
    event.currentTarget.value = sanitizePhoneInput(event.currentTarget.value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!agreed || isSending) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    setSubmitStatus('sending');

    try {
      await sendContactRequest({
        formType: 'contact',
        name: getContactFormValue(formData, 'name'),
        phone: getContactFormValue(formData, 'phone'),
        comment: getContactFormValue(formData, 'comment'),
        pageUrl: window.location.href,
        consent: agreed,
      });
      form.reset();
      setAgreed(true);
      setSubmitStatus('success');
    } catch {
      setSubmitStatus('error');
    }
  };

  return (
    <div className="bg-[#f5f0e8] p-8 max-w-sm w-full">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="relative">
          <input
            type="text"
            name="name"
            required
            disabled={isSending}
            placeholder={t('namePlaceholder')}
            className="w-full bg-white border border-gray-300 border-2 px-4 py-3 text-sm outline-none focus:border-gray-400 pr-6"
          />
          <span className="absolute right-3 top-3 text-red-500 text-sm">*</span>
        </div>

        <div>
          <input
            type="tel"
            name="phone"
            disabled={isSending}
            inputMode="tel"
            autoComplete="tel"
            pattern={phoneInputPattern}
            maxLength={phoneInputMaxLength}
            title={t('phoneInvalid')}
            onInput={handlePhoneInput}
            placeholder={t('phonePlaceholder')}
            className="w-full bg-white border border-gray-300 border-2 px-4 py-3 text-sm outline-none focus:border-gray-400"
          />
        </div>

        <div className="relative">
          <textarea
            name="comment"
            required
            disabled={isSending}
            placeholder={t('commentPlaceholder')}
            rows={4}
            className="w-full bg-white border border-gray-300 px-4 border-2 py-3 text-sm outline-none focus:border-gray-400 resize-none pr-6"
          />
          <span className="absolute right-3 top-3 text-red-500 text-sm">*</span>
        </div>

        <button
          type="submit"
          disabled={!agreed || isSending}
          className="w-full bg-[#2d5a3d] hover:bg-[#244a32] disabled:bg-[#8ca399] disabled:cursor-not-allowed text-white rounded-full py-3 text-base font-medium transition-colors mt-2">
          {isSending ? t('sending') : t('submit')}
        </button>

        {submitStatus === 'success' ? (
          <p role="status" className="text-sm font-medium text-[#166534]">
            {t('success')}
          </p>
        ) : null}

        {submitStatus === 'error' ? (
          <p role="alert" className="text-sm font-medium text-[#b42318]">
            {t('error')}
          </p>
        ) : null}

        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 accent-[#2d5a3d] shrink-0"
          />
          <span className="text-xs text-gray-600 leading-snug">
            {t('consent')}{' '}
            <Link href="/privacy" className="text-blue-500 hover:underline">
              {t('consentLink')}
            </Link>
          </span>
        </label>
      </form>
    </div>
  );
}
