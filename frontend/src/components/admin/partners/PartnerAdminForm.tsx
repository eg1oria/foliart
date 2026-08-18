'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { FiExternalLink, FiSave } from 'react-icons/fi';

import {
  createPartnerAction,
  type PartnerActionState,
  updatePartnerAction,
} from '../../../app/[locale]/admin/partners/actions';
import AdminImageInput from '@/components/admin/AdminImageInput';
import { Link } from '@/i18n/routing';
import type { Partner } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media';
import type { PartnerFormFieldErrors } from '@/lib/partnerAdmin';

import {
  adminCx,
  adminFieldClassName,
  adminHintClassName,
  adminInputClassName,
  adminLabelClassName,
  adminOptionalLabelClassName,
  adminPrimaryButtonClassName,
  adminSecondaryButtonClassName,
  adminTextareaClassName,
} from '../adminStyles';

const initialState: PartnerActionState = { status: 'idle' };

function FieldError({ error, id }: { error?: string; id: string }) {
  if (!error) return null;
  return (
    <span id={id} data-field-error className="text-xs font-medium leading-5 text-red-700">
      {error}
    </span>
  );
}

export default function PartnerAdminForm({
  locale,
  mode,
  partner,
  successMessage,
}: {
  locale: string;
  mode: 'create' | 'edit';
  partner?: Partner;
  successMessage?: string | null;
}) {
  const action = mode === 'create' ? createPartnerAction : updatePartnerAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [dirty, setDirty] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const fieldErrors: PartnerFormFieldErrors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.status === 'error') {
      errorRef.current?.focus();
    }
  }, [state]);

  useEffect(() => {
    if (!dirty) return;

    const message = 'Есть несохранённые изменения. Уйти без сохранения?';
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const guardLinks = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!target || window.confirm(message)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', guardLinks, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', guardLinks, true);
    };
  }, [dirty]);

  return (
    <form action={formAction} className="space-y-5" onChange={() => setDirty(true)}>
      <input type="hidden" name="locale" value={locale} />
      {partner ? <input type="hidden" name="partnerId" value={partner.id} /> : null}

      {successMessage ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      {state.status === 'error' ? (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 outline-none focus:ring-2 focus:ring-red-300">
          {state.message ?? 'Не удалось сохранить партнёра.'}
        </div>
      ) : null}

      <section className="rounded-lg border border-[#0b5a45]/10 bg-white p-4 sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0b5a45]">
          Карточка партнёра
        </p>
        <p className={adminCx('mt-3', adminHintClassName)}>
          Обязательно только наименование. Пустые поля не выводятся в карточке на сайте.
        </p>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <label className={adminFieldClassName}>
            <span className={adminLabelClassName}>Наименование</span>
            <input
              type="text"
              name="name"
              required
              defaultValue={partner?.name ?? ''}
              placeholder='ООО "ЭкоГрин"'
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? 'partner-name-error' : undefined}
              className={adminInputClassName}
            />
            <FieldError error={fieldErrors.name} id="partner-name-error" />
          </label>

          <label className={adminFieldClassName}>
            <span className={adminLabelClassName}>
              Адрес <span className={adminOptionalLabelClassName}>— необязательно</span>
            </span>
            <input
              type="text"
              name="address"
              defaultValue={partner?.address ?? ''}
              placeholder="г. Краснодар"
              className={adminInputClassName}
            />
          </label>

          <label className={adminFieldClassName}>
            <span className={adminLabelClassName}>
              Телефоны <span className={adminOptionalLabelClassName}>— необязательно</span>
            </span>
            <textarea
              name="phones"
              rows={4}
              defaultValue={partner?.phones ?? ''}
              placeholder="+7 (861) 224-75-37&#10;+7 (989) 802 43 78"
              className={adminTextareaClassName}
            />
            <span className={adminHintClassName}>
              По одному номеру в строке — каждый станет отдельной ссылкой в карточке.
            </span>
          </label>

          <div className="grid gap-5">
            <label className={adminFieldClassName}>
              <span className={adminLabelClassName}>
                E-mail <span className={adminOptionalLabelClassName}>— необязательно</span>
              </span>
              <input
                type="email"
                name="email"
                defaultValue={partner?.email ?? ''}
                placeholder="info@ecogreen.ru"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'partner-email-error' : undefined}
                className={adminInputClassName}
              />
              <FieldError error={fieldErrors.email} id="partner-email-error" />
            </label>

            <label className={adminFieldClassName}>
              <span className={adminLabelClassName}>
                Сайт <span className={adminOptionalLabelClassName}>— необязательно</span>
              </span>
              <input
                type="text"
                name="website"
                defaultValue={partner?.website ?? ''}
                placeholder="https://ecogreen.ru"
                aria-invalid={Boolean(fieldErrors.website)}
                aria-describedby={fieldErrors.website ? 'partner-website-error' : undefined}
                className={adminInputClassName}
              />
              <FieldError error={fieldErrors.website} id="partner-website-error" />
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#0b5a45]/10 bg-white p-4 sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0b5a45]">
          Логотип и порядок
        </p>
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
          <AdminImageInput
            name="logo"
            label="Логотип партнёра"
            initialSrc={resolveMediaUrl(partner?.logoUrl)}
            error={fieldErrors.logo}
          />

          <label className={adminFieldClassName}>
            <span className={adminLabelClassName}>Порядок вывода</span>
            <input
              type="number"
              name="sortOrder"
              step={1}
              defaultValue={partner ? String(partner.sortOrder) : '0'}
              aria-invalid={Boolean(fieldErrors.sortOrder)}
              aria-describedby={fieldErrors.sortOrder ? 'partner-sortOrder-error' : undefined}
              className={adminInputClassName}
            />
            <span className={adminHintClassName}>
              Меньшее число — выше в списке партнёров.
            </span>
            <FieldError error={fieldErrors.sortOrder} id="partner-sortOrder-error" />
          </label>
        </div>
      </section>

      <div className="sticky bottom-4 z-30 rounded-xl border border-[#0b5a45]/15 bg-white/95 p-3 shadow-[0_18px_45px_-20px_rgba(11,62,49,0.35)] backdrop-blur sm:p-4">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/admin/partners" className={adminSecondaryButtonClassName}>
              Отмена
            </Link>
            <Link
              href="/about/partnery"
              target="_blank"
              className={adminCx(adminSecondaryButtonClassName, 'gap-2')}>
              <FiExternalLink aria-hidden="true" />
              Открыть страницу партнёров
            </Link>
          </div>
          <button
            type="submit"
            disabled={pending}
            className={adminCx(adminPrimaryButtonClassName, 'min-w-44 gap-2')}>
            <FiSave aria-hidden="true" />
            {pending
              ? 'Сохранение…'
              : mode === 'create'
                ? 'Создать партнёра'
                : 'Сохранить партнёра'}
          </button>
        </div>
      </div>
    </form>
  );
}
