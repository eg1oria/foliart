'use client';

import type { FormEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { RxCross1 } from 'react-icons/rx';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  type ContactFormType,
  getContactFormValue,
  phoneInputMaxLength,
  phoneInputPattern,
  sanitizePhoneInput,
  sendContactRequest,
} from '@/lib/contact';

type ContactModalTriggerProps = {
  children: ReactNode;
  className?: string;
  modalType?: 'callback' | 'question';
  onOpen?: () => void;
};

export default function ContactModalTrigger({
  children,
  className,
  modalType = 'callback',
  onOpen,
}: ContactModalTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'sending' | 'success' | 'error'
  >('idle');
  const formT = useTranslations('ContactForm');
  const callbackT = useTranslations('CallbackModal');
  const questionT = useTranslations('QuestionModal');
  const isQuestionModal = modalType === 'question';
  const closeLabel = isQuestionModal ? questionT('close') : callbackT('close');
  const isSending = submitStatus === 'sending';

  const handlePhoneInput = (event: FormEvent<HTMLInputElement>) => {
    event.currentTarget.value = sanitizePhoneInput(event.currentTarget.value);
  };

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const openModal = () => {
    setIsOpen(true);
    setSubmitStatus('idle');
    onOpen?.();
  };

  const handleSubmit =
    (formType: ContactFormType) => async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!agreed || isSending) {
        return;
      }

      const form = event.currentTarget;
      const formData = new FormData(form);

      setSubmitStatus('sending');

      try {
        await sendContactRequest({
          formType,
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

  const renderRequiredMarker = () => (
    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-[#e24a3b]">*</span>
  );

  const renderConsent = () => (
    <label className="mt-1 flex cursor-pointer items-start gap-2">
      <input
        type="checkbox"
        checked={agreed}
        onChange={(event) => setAgreed(event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-[#6b6b6b]"
      />
      <span className="text-sm leading-[1.35] text-[#8a8a8a]">
        {formT('consent')}{' '}
        <Link
          href="/privacy"
          onClick={() => setIsOpen(false)}
          className="text-[#006fd6] transition hover:underline">
          {formT('consentLink')}
        </Link>
      </span>
    </label>
  );

  const renderSubmitStatus = () => {
    if (submitStatus === 'success') {
      return (
        <p role="status" className="text-center text-sm font-medium text-[#166534]">
          {formT('success')}
        </p>
      );
    }

    if (submitStatus === 'error') {
      return (
        <p role="alert" className="text-center text-sm font-medium text-[#b42318]">
          {formT('error')}
        </p>
      );
    }

    return null;
  };

  const renderQuestionArtwork = () => {
    return (
      <div className="relative hidden min-h-[622px] overflow-hidden bg-white min-[760px]:block">
        <Image src="/question.webp" alt="" fill sizes="470px" className="object-cover" />
      </div>
    );
  };

  const renderCallbackForm = () => (
    <div className="relative w-full max-w-[366px] bg-[#f7f5ee] px-6 py-8 shadow-[0_26px_50px_-34px_rgba(0,0,0,0.9)] sm:px-[25px] sm:py-8">
      <h2
        id="contact-modal-title"
        className="text-center text-[1.25rem] font-bold leading-tight text-[#071524]">
        {callbackT('title')}
      </h2>
      <p className="mt-5 text-center text-sm leading-5 text-[#858585]">{callbackT('subtitle')}</p>

      <form className="mt-7 flex flex-col gap-4" onSubmit={handleSubmit('callback')}>
        <label className="relative block">
          <span className="sr-only">{formT('namePlaceholder')}</span>
          <input
            type="text"
            name="name"
            required
            disabled={isSending}
            placeholder={formT('namePlaceholder')}
            className="h-[54px] w-full border-2 border-[#d5d5d5] bg-white px-4 pr-9 text-base text-[#243238] outline-none transition placeholder:text-[#737373] focus:border-[#aeb5b2]"
          />
          {renderRequiredMarker()}
        </label>

        <label className="relative block">
          <span className="sr-only">{formT('phonePlaceholder')}</span>
          <input
            type="tel"
            name="phone"
            required
            disabled={isSending}
            inputMode="tel"
            autoComplete="tel"
            pattern={phoneInputPattern}
            maxLength={phoneInputMaxLength}
            title={formT('phoneInvalid')}
            onInput={handlePhoneInput}
            placeholder={formT('phonePlaceholder')}
            className="h-[54px] w-full border-2 border-[#d5d5d5] bg-white px-4 pr-9 text-base text-[#243238] outline-none transition placeholder:text-[#737373] focus:border-[#aeb5b2]"
          />
          {renderRequiredMarker()}
        </label>

        <button
          type="submit"
          disabled={!agreed || isSending}
          className="mt-3 flex min-h-[57px] w-full cursor-pointer items-center justify-center rounded-full bg-[#064834] px-6 py-3 text-base font-bold text-white transition hover:bg-[#053b2b] disabled:cursor-not-allowed disabled:bg-[#8ca399]">
          {isSending ? formT('sending') : formT('submit')}
        </button>

        {renderSubmitStatus()}

        {renderConsent()}
      </form>
    </div>
  );

  const renderQuestionForm = () => (
    <div className="grid w-full max-w-[836px] overflow-hidden min-[760px]:grid-cols-[470px_366px]">
      {renderQuestionArtwork()}

      <div className="bg-[#f7f5ee] px-6 py-8 sm:px-[25px]">
        <h2
          id="contact-modal-title"
          className="text-center text-[1.25rem] font-bold leading-tight text-[#071524]">
          {questionT('title')}
        </h2>
        <p className="mt-5 text-center text-sm leading-5 text-[#858585]">{questionT('subtitle')}</p>

        <form className="mt-7 flex flex-col gap-4" onSubmit={handleSubmit('question')}>
          <label className="relative block">
            <span className="sr-only">{formT('namePlaceholder')}</span>
            <input
              type="text"
              name="name"
              required
              disabled={isSending}
              placeholder={formT('namePlaceholder')}
              className="h-[54px] w-full border-2 border-[#d5d5d5] bg-white px-4 pr-9 text-base text-[#243238] outline-none transition placeholder:text-[#737373] focus:border-[#aeb5b2]"
            />
            {renderRequiredMarker()}
          </label>

          <label className="relative block">
            <span className="sr-only">{formT('phonePlaceholder')}</span>
            <input
              type="tel"
              name="phone"
              required
              disabled={isSending}
              inputMode="tel"
              autoComplete="tel"
              pattern={phoneInputPattern}
              maxLength={phoneInputMaxLength}
              title={formT('phoneInvalid')}
              onInput={handlePhoneInput}
              placeholder={formT('phonePlaceholder')}
              className="h-[54px] w-full border-2 border-[#d5d5d5] bg-white px-4 pr-9 text-base text-[#243238] outline-none transition placeholder:text-[#737373] focus:border-[#aeb5b2]"
            />
            {renderRequiredMarker()}
          </label>

          <label className="block">
            <span className="sr-only">{formT('commentPlaceholder')}</span>
            <textarea
              name="comment"
              disabled={isSending}
              placeholder={formT('commentPlaceholder')}
              rows={4}
              className="min-h-[109px] w-full resize-none border-2 border-[#d5d5d5] bg-white px-4 py-3 text-base text-[#243238] outline-none transition placeholder:text-[#737373] focus:border-[#aeb5b2]"
            />
          </label>

          <button
            type="submit"
            disabled={!agreed || isSending}
            className="mt-3 flex min-h-[59px] w-full cursor-pointer items-center justify-center rounded-full bg-[#064834] px-6 py-3 text-base font-bold text-white transition hover:bg-[#053b2b] disabled:cursor-not-allowed disabled:bg-[#8ca399]">
            {isSending ? formT('sending') : questionT('submit')}
          </button>

          {renderSubmitStatus()}

          {renderConsent()}
        </form>
      </div>
    </div>
  );

  const modal = (
    <div
      className="fixed inset-0 z-[300] flex items-start justify-center overflow-y-auto bg-[#2f2f2f]/95 px-4 py-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
      onMouseDown={() => setIsOpen(false)}>
      <div
        className={`relative w-full ${isQuestionModal ? 'max-w-[836px]' : 'max-w-[366px]'}`}
        onMouseDown={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute right-0 top-0 translate-x-[calc(100%+16px)] text-white/80 transition hover:text-white max-[520px]:right-3 max-[520px]:top-3 max-[520px]:translate-x-0 max-[520px]:text-[#8b8b8b]"
          aria-label={closeLabel}>
          <RxCross1 size={31} />
        </button>
        {isQuestionModal ? renderQuestionForm() : renderCallbackForm()}
      </div>
    </div>
  );

  return (
    <>
      <button type="button" onClick={openModal} className={className}>
        {children}
      </button>
      {isOpen ? createPortal(modal, document.body) : null}
    </>
  );
}
