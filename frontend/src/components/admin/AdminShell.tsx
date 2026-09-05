'use client';

import type { ReactNode } from 'react';

import { adminBadgeClassName, adminCx, adminMutedTextClassName } from './adminStyles';

type AdminStat = {
  hint?: string;
  label: string;
  value: string;
};

export function AdminShell({
  children,
  description,
  stats,
  title,
}: {
  children: ReactNode;
  description: string;
  stats?: AdminStat[];
  title: string;
}) {
  const visibleStats = stats?.filter((stat) => stat.value) ?? [];

  return (
    <>
      {visibleStats.length ? (
        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-[#0b5a45]/10 bg-white px-4 py-3.5">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#93a69d]">
                {stat.label}
              </dt>
              <dd className="mt-1.5 text-xl font-semibold leading-tight text-[#0b3e31]">
                {stat.value}
              </dd>
              {stat.hint ? (
                <dd className="mt-1.5 text-xs leading-5 text-[#7b9189]">{stat.hint}</dd>
              ) : null}
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mt-6 min-w-0">{children}</div>
    </>
  );
}

export function AdminPanel({
  badge,
  children,
  className,
  description,
  headerContent,
  id,
  title,
  tone = 'default',
}: {
  badge?: string;
  children: ReactNode;
  className?: string;
  description?: string;
  headerContent?: ReactNode;
  id?: string;
  title: string;
  tone?: 'default' | 'muted';
}) {
  return (
    <section
      id={id}
      className={adminCx(
        'min-w-0 rounded-lg border p-4 shadow-[0_18px_45px_-38px_rgba(11,62,49,0.8)] sm:p-5 lg:p-6',
        tone === 'default' ? 'border-[#0b5a45]/10 bg-white' : 'border-[#0b5a45]/10 bg-[#fbfaf6]',
        className,
      )}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-3xl">
          <h2 className="mt-3 text-xl font-semibold leading-tight text-[#0b3e31] sm:text-2xl">
            {title}
          </h2>
          {description ? (
            <p className={adminCx('mt-3', adminMutedTextClassName)}>{description}</p>
          ) : null}
        </div>

        {headerContent ? <div className="min-w-0 shrink-0">{headerContent}</div> : null}
      </div>

      <div className="mt-6">{children}</div>
    </section>
  );
}

export function AdminNotice({
  children,
  tone,
}: {
  children: ReactNode;
  tone: 'success' | 'error';
}) {
  return (
    <div
      role="alert"
      className={adminCx(
        'rounded-lg border px-4 py-3 text-sm leading-6',
        tone === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-rose-200 bg-rose-50 text-rose-800',
      )}>
      {children}
    </div>
  );
}

export function AdminEmptyState({
  badge,
  description,
  title,
}: {
  badge?: string;
  description: string;
  title: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-[#0b5a45]/18 bg-white/70 px-5 py-8 text-center sm:px-8">
      {badge ? <p className={adminBadgeClassName}>{badge}</p> : null}
      <h3 className="mt-4 text-lg font-semibold text-[#0b3e31]">{title}</h3>
      <p className={adminCx('mt-2', adminMutedTextClassName)}>{description}</p>
    </div>
  );
}
