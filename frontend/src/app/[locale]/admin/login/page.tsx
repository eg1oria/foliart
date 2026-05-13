import { redirect } from 'next/navigation';
import { FiLock, FiLogIn, FiUser } from 'react-icons/fi';

import {
  adminCx,
  adminHintClassName,
  adminInputClassName,
  adminLabelClassName,
  adminPrimaryButtonClassName,
} from '@/components/admin/adminStyles';
import { getSafeAdminNextPath } from '@/lib/adminAuth';
import { isAdminAuthenticated } from '@/lib/adminAuthServer';

import { loginAdminAction } from './actions';

type AdminLoginSearchParams = {
  error?: string;
  next?: string;
};

export default async function AdminLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<AdminLoginSearchParams>;
}) {
  const { locale } = await params;
  const { error, next } = await searchParams;
  const nextPath = getSafeAdminNextPath(locale, next);

  if (await isAdminAuthenticated()) {
    redirect(nextPath);
  }

  const isEnglish = locale === 'en';
  const copy = {
    badge: isEnglish ? 'Secure area' : 'Закрытый доступ',
    title: isEnglish ? 'Admin login' : 'Вход в админку',
    subtitle: isEnglish
      ? 'Enter your admin credentials to manage products, articles, and crop calendars.'
      : 'Введите логин и пароль, чтобы управлять товарами, статьями и календарем культур.',
    username: isEnglish ? 'Login' : 'Логин',
    password: isEnglish ? 'Password' : 'Пароль',
    submit: isEnglish ? 'Sign in' : 'Войти',
    error: isEnglish ? 'Incorrect login or password.' : 'Неверный логин или пароль.',
    hint: isEnglish
      ? 'Access is saved in this browser for 12 hours.'
      : 'Доступ сохранится в этом браузере на 12 часов.',
  };

  return (
    <main className="relative flex min-h-screen w-full flex-1 items-center bg-[#f3f5f1] px-4 pb-12 pt-28 sm:px-6 sm:pb-16 sm:pt-32 md:pt-52 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[#0b5a45] sm:h-28 md:h-52" />

      <section className="relative mx-auto grid w-full max-w-[980px] overflow-hidden rounded-lg border border-[#0b5a45]/10 bg-white shadow-[0_24px_70px_-54px_rgba(11,62,49,0.95)] lg:grid-cols-[minmax(0,0.95fr)_minmax(340px,0.62fr)]">
        <div className="bg-[#0b5a45] px-5 py-7 text-white sm:px-7 sm:py-9 lg:px-8 lg:py-12">
          <span className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#d8ead8]">
            <FiLock className="text-sm" />
            Foliart Admin
          </span>

          <h1 className="mt-4 max-w-2xl text-2xl font-semibold leading-tight sm:text-3xl">
            {copy.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78 sm:text-base sm:leading-7">
            {copy.subtitle}
          </p>
        </div>

        <form action={loginAdminAction} className="min-w-0 px-5 py-7 sm:px-7 sm:py-9 lg:px-8">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="next" value={nextPath} />

          <div className="space-y-5">
            {error ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
                {copy.error}
              </div>
            ) : null}

            <label className="flex flex-col gap-2.5">
              <span className={adminLabelClassName}>{copy.username}</span>
              <span className="relative">
                <FiUser className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6a7f76]" />
                <input
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  className={adminCx(adminInputClassName, 'w-full pl-11')}
                />
              </span>
            </label>

            <label className="flex flex-col gap-2.5">
              <span className={adminLabelClassName}>{copy.password}</span>
              <span className="relative">
                <FiLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6a7f76]" />
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className={adminCx(adminInputClassName, 'w-full pl-11')}
                />
              </span>
            </label>
          </div>

          <button type="submit" className={adminCx(adminPrimaryButtonClassName, 'mt-7 w-full gap-2')}>
            <FiLogIn />
            <span>{copy.submit}</span>
          </button>

          <p className={adminCx('mt-4 text-center', adminHintClassName)}>{copy.hint}</p>
        </form>
      </section>
    </main>
  );
}
