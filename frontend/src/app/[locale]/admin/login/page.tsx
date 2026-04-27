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
    <main className="relative mx-auto flex w-full max-w-[92rem] flex-1 items-center px-4 pb-16 pt-44 sm:px-6 sm:pb-20 lg:px-8 lg:pt-48">
      <div className="pointer-events-none absolute inset-x-0 top-24 -z-10 h-80 bg-[radial-gradient(circle_at_top,rgba(11,90,69,0.18),transparent_68%)] blur-3xl" />

      <section className="grid w-full overflow-hidden rounded-[2rem] border border-[#0b5a45]/10 bg-white shadow-[0_35px_120px_-72px_rgba(11,62,49,0.95)] lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.58fr)]">
        <div className="bg-[linear-gradient(135deg,#0b5a45,#0a3e31_56%,#082b23)] px-6 py-9 text-white sm:px-8 sm:py-12 lg:px-10 lg:py-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#d8ead8]">
            <FiLock className="text-sm" />
            Foliart Admin
          </span>

          <h1 className="mt-5 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78 sm:text-base lg:text-lg">
            {copy.subtitle}
          </p>
        </div>

        <form action={loginAdminAction} className="px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="next" value={nextPath} />

          <div className="space-y-5">
            {error ? (
              <div className="rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
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
