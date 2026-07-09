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

export default function ContactEmailForm() {
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
        email: getContactFormValue(formData, 'email'),
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

  const requiredMarker = (
    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-[#e24a3b]">*</span>
  );

  return (
    <div className="w-full max-w-[366px] bg-[#f7f5ee] px-6 py-8 shadow-[0_26px_50px_-34px_rgba(0,0,0,0.9)] sm:px-[25px]">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="relative block">
          <span className="sr-only">{t('namePlaceholder')}</span>
          <input
            type="text"
            name="name"
            required
            disabled={isSending}
            autoComplete="name"
            placeholder={t('namePlaceholder')}
            className="h-[54px] w-full border-2 border-[#d5d5d5] bg-white px-4 pr-9 text-base text-[#243238] outline-none transition placeholder:text-[#737373] focus:border-[#aeb5b2]"
          />
          {requiredMarker}
        </label>

        <label className="block">
          <span className="sr-only">{t('phonePlaceholder')}</span>
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
            className="h-[54px] w-full border-2 border-[#d5d5d5] bg-white px-4 text-base text-[#243238] outline-none transition placeholder:text-[#737373] focus:border-[#aeb5b2]"
          />
        </label>

        <label className="relative block">
          <span className="sr-only">{t('emailPlaceholder')}</span>
          <input
            type="email"
            name="email"
            required
            disabled={isSending}
            autoComplete="email"
            maxLength={254}
            placeholder={t('emailPlaceholder')}
            className="h-[54px] w-full border-2 border-[#d5d5d5] bg-white px-4 pr-9 text-base text-[#243238] outline-none transition placeholder:text-[#737373] focus:border-[#aeb5b2]"
          />
          {requiredMarker}
        </label>

        <label className="relative block">
          <span className="sr-only">{t('commentPlaceholder')}</span>
          <textarea
            name="comment"
            required
            disabled={isSending}
            placeholder={t('commentPlaceholder')}
            rows={4}
            className="min-h-[109px] w-full resize-none border-2 border-[#d5d5d5] bg-white px-4 py-3 pr-9 text-base text-[#243238] outline-none transition placeholder:text-[#737373] focus:border-[#aeb5b2]"
          />
          <span className="absolute right-3 top-3 text-lg text-[#e24a3b]">*</span>
        </label>

        <button
          type="submit"
          disabled={!agreed || isSending}
          className="mt-3 flex min-h-[59px] w-full cursor-pointer items-center justify-center rounded-full bg-[#064834] px-6 py-3 text-base font-bold text-white transition hover:bg-[#053b2b] disabled:cursor-not-allowed disabled:bg-[#8ca399]">
          {isSending ? t('sending') : t('submit')}
        </button>

        {submitStatus === 'success' ? (
          <p role="status" className="text-center text-sm font-medium text-[#166534]">
            {t('success')}
          </p>
        ) : null}

        {submitStatus === 'error' ? (
          <p role="alert" className="text-center text-sm font-medium text-[#b42318]">
            {t('error')}
          </p>
        ) : null}

        <label className="mt-1 flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[#6b6b6b]"
          />
          <span className="text-sm leading-[1.35] text-[#8a8a8a]">
            {t('consent')}{' '}
            <Link href="/privacy" className="text-[#006fd6] transition hover:underline">
              {t('consentLink')}
            </Link>
          </span>
        </label>
      </form>
    </div>
  );
}
