export function adminCx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

const adminInputBaseClassName =
  'min-h-11 w-full min-w-0 rounded-lg border border-[#0b5a45]/14 px-3.5 py-2.5 text-sm text-[#0b3e31] outline-none transition placeholder:text-[#7e9088] focus:border-[#0b5a45] focus:bg-white focus:ring-2 focus:ring-[#0b5a45]/10';

export const adminFieldClassName = 'flex flex-col gap-2.5';
export const adminLabelClassName = 'text-sm font-semibold text-[#0b3e31]';
export const adminOptionalLabelClassName = 'font-medium text-[#7e9088]';
export const adminInputClassName = `${adminInputBaseClassName} bg-[#f8f7f2]`;
export const adminInputOnWhiteClassName = `${adminInputBaseClassName} bg-white`;
export const adminTextareaClassName = `${adminInputClassName} resize-y`;
export const adminTextareaOnWhiteClassName = `${adminInputOnWhiteClassName} resize-y`;
export const adminFileInputClassName =
  'block w-full max-w-full overflow-hidden rounded-lg border border-dashed border-[#0b5a45]/20 bg-[#f8f7f2] px-3.5 py-3 text-xs text-[#0b3e31] transition file:mb-2 file:mr-3 file:rounded-md file:border-0 file:bg-[#0b5a45] file:px-3.5 file:py-2 file:text-xs file:font-semibold file:text-white hover:border-[#0b5a45]/35 sm:text-sm sm:file:mb-0 sm:file:text-sm';
export const adminHintClassName = 'text-xs leading-5 text-[#6a7f76]';
export const adminMutedTextClassName = 'text-sm leading-6 text-[#567068]';
export const adminTranslationCardClassName =
  'rounded-lg border border-[#0b5a45]/10 bg-[#f7f9f6] p-4 sm:p-5';
export const adminDetailsClassName =
  'min-w-0 overflow-hidden rounded-lg border border-[#0b5a45]/10 bg-[#f8f7f2]';
export const adminSummaryClassName =
  'flex cursor-pointer list-none flex-col items-start justify-between gap-1.5 px-4 py-3 text-sm font-semibold text-[#0b5a45] transition hover:bg-[#eef4ef] sm:flex-row sm:items-center sm:gap-3 [&::-webkit-details-marker]:hidden';
export const adminPrimaryButtonClassName =
  'inline-flex min-h-11 min-w-0 items-center justify-center rounded-lg bg-[#0b5a45] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[#094635] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b5a45]/20';
export const adminSecondaryButtonClassName =
  'inline-flex min-h-10 min-w-0 items-center justify-center rounded-lg border border-[#0b5a45]/14 bg-white px-3.5 py-2 text-center text-sm font-semibold text-[#0b3e31] transition hover:border-[#0b5a45]/30 hover:bg-[#eef4ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b5a45]/12';
export const adminDangerButtonClassName =
  'inline-flex min-h-10 min-w-0 items-center justify-center rounded-lg border border-red-200 bg-white px-3.5 py-2 text-center text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-60';
export const adminGhostLinkClassName =
  'inline-flex min-h-10 min-w-0 items-center justify-center rounded-lg border border-[#0b5a45]/14 bg-white px-3.5 py-2 text-center text-sm font-semibold text-[#0b3e31] transition hover:border-[#0b5a45]/28 hover:bg-[#eef4ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b5a45]/12';
export const adminInlineLinkClassName =
  'text-sm font-semibold text-[#0b5a45] underline-offset-4 transition hover:underline';
export const adminBadgeClassName =
  'inline-flex max-w-full items-center rounded-md border border-[#0b5a45]/10 bg-[#eef4ef] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0b5a45]';
