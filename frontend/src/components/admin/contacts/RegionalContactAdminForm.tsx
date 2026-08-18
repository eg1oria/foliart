'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { FiExternalLink, FiSave } from 'react-icons/fi';

import {
  createRegionalContactAction,
  type RegionalContactActionState,
  updateRegionalContactAction,
} from '../../../app/[locale]/admin/contacts/actions';
import { Link } from '@/i18n/routing';
import type { RegionalContact } from '@/lib/api';
import type { RegionalContactFormFieldErrors } from '@/lib/regionalContacts';

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

const initialState: RegionalContactActionState = { status: 'idle' };

function FieldError({ error, id }: { error?: string; id: string }) {
  if (!error) return null;
  return (
    <span id={id} data-field-error className="text-xs font-medium leading-5 text-red-700">
      {error}
    </span>
  );
}

export default function RegionalContactAdminForm({
  contact,
  locale,
  mode,
  successMessage,
}: {
  contact?: RegionalContact;
  locale: string;
  mode: 'create' | 'edit';
  successMessage?: string | null;
}) {
  const action = mode === 'create' ? createRegionalContactAction : updateRegionalContactAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [dirty, setDirty] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const fieldErrors: RegionalContactFormFieldErrors = state.fieldErrors ?? {};

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
      {contact ? <input type="hidden" name="contactId" value={contact.id} /> : null}

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
          {state.message ?? 'Не удалось сохранить контакт.'}
        </div>
      ) : null}

      <section className="rounded-lg border border-[#0b5a45]/10 bg-white p-4 sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0b5a45]">
          Контакт в регионе
        </p>
        <p className={adminCx('mt-3', adminHintClassName)}>
          Обязательно только наименование региона. Пустые поля не выводятся в списке на сайте.
        </p>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <label className={adminFieldClassName}>
            <span className={adminLabelClassName}>Наименование региона</span>
            <input
              type="text"
              name="region"
              required
              defaultValue={contact?.region ?? ''}
              placeholder="Краснодарский край"
              aria-invalid={Boolean(fieldErrors.region)}
              aria-describedby={fieldErrors.region ? 'contact-region-error' : undefined}
              className={adminInputClassName}
            />
            <FieldError error={fieldErrors.region} id="contact-region-error" />
          </label>

          <label className={adminFieldClassName}>
            <span className={adminLabelClassName}>
              ФИО <span className={adminOptionalLabelClassName}>— необязательно</span>
            </span>
            <input
              type="text"
              name="fullName"
              defaultValue={contact?.fullName ?? ''}
              placeholder="Иванов Иван Иванович"
              className={adminInputClassName}
            />
          </label>

          <label className={adminFieldClassName}>
            <span className={adminLabelClassName}>
              Телефон <span className={adminOptionalLabelClassName}>— необязательно</span>
            </span>
            <input
              type="text"
              name="phone"
              defaultValue={contact?.phone ?? ''}
              placeholder="+7 (861) 224-75-37"
              className={adminInputClassName}
            />
            <span className={adminHintClassName}>
              Номер станет кликабельной ссылкой в списке контактов.
            </span>
          </label>

          <label className={adminFieldClassName}>
            <span className={adminLabelClassName}>
              Адрес <span className={adminOptionalLabelClassName}>— необязательно</span>
            </span>
            <textarea
              name="address"
              rows={3}
              defaultValue={contact?.address ?? ''}
              placeholder="350072, г. Краснодар, ул. Солнечная, 10/3"
              className={adminTextareaClassName}
            />
          </label>

          <label className={adminFieldClassName}>
            <span className={adminLabelClassName}>Порядок вывода</span>
            <input
              type="number"
              name="sortOrder"
              step={1}
              defaultValue={contact ? String(contact.sortOrder) : '0'}
              aria-invalid={Boolean(fieldErrors.sortOrder)}
              aria-describedby={fieldErrors.sortOrder ? 'contact-sortOrder-error' : undefined}
              className={adminInputClassName}
            />
            <span className={adminHintClassName}>Меньшее число — выше в списке.</span>
            <FieldError error={fieldErrors.sortOrder} id="contact-sortOrder-error" />
          </label>
        </div>
      </section>

      <div className="sticky bottom-4 z-30 rounded-xl border border-[#0b5a45]/15 bg-white/95 p-3 shadow-[0_18px_45px_-20px_rgba(11,62,49,0.35)] backdrop-blur sm:p-4">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/admin/contacts" className={adminSecondaryButtonClassName}>
              Отмена
            </Link>
            <Link
              href="/contacts"
              target="_blank"
              className={adminCx(adminSecondaryButtonClassName, 'gap-2')}>
              <FiExternalLink aria-hidden="true" />
              Открыть страницу контактов
            </Link>
          </div>
          <button
            type="submit"
            disabled={pending}
            className={adminCx(adminPrimaryButtonClassName, 'min-w-44 gap-2')}>
            <FiSave aria-hidden="true" />
            {pending ? 'Сохранение…' : mode === 'create' ? 'Создать контакт' : 'Сохранить контакт'}
          </button>
        </div>
      </div>
    </form>
  );
}
