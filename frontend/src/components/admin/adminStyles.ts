export function adminCx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

const adminInputBaseClassName =
  'min-h-12 rounded-[1.15rem] border border-[#0b5a45]/12 px-4 py-3 text-[0.97rem] text-[#0b3e31] outline-none transition placeholder:text-[#7e9088] focus:border-[#0b5a45] focus:bg-white';

export const adminFieldClassName = 'flex flex-col gap-2.5';
export const adminLabelClassName = 'text-sm font-semibold text-[#0b3e31]';
export const adminOptionalLabelClassName = 'font-medium text-[#7e9088]';
export const adminInputClassName = `${adminInputBaseClassName} bg-[#f8f7f2]`;
export const adminInputOnWhiteClassName = `${adminInputBaseClassName} bg-white`;
export const adminTextareaClassName = `${adminInputClassName} resize-y`;
export const adminTextareaOnWhiteClassName = `${adminInputOnWhiteClassName} resize-y`;
export const adminFileInputClassName =
  'block w-full rounded-[1.15rem] border border-dashed border-[#0b5a45]/20 bg-[#f8f7f2] px-4 py-3 text-sm text-[#0b3e31] transition file:mr-4 file:rounded-full file:border-0 file:bg-[#0b5a45] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:border-[#0b5a45]/35';
export const adminHintClassName = 'text-xs leading-5 text-[#6a7f76]';
export const adminMutedTextClassName = 'text-sm leading-6 text-[#567068]';
export const adminTranslationCardClassName =
  'rounded-[1.45rem] border border-[#0b5a45]/10 bg-[#f7f9f6] p-5 sm:p-6';
export const adminDetailsClassName =
  'overflow-hidden rounded-[1.35rem] border border-[#0b5a45]/10 bg-[#f8f7f2]';
export const adminSummaryClassName =
  'flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-semibold text-[#0b5a45] transition hover:bg-[#eef4ef] [&::-webkit-details-marker]:hidden';
export const adminPrimaryButtonClassName =
  'inline-flex min-h-12 items-center justify-center rounded-full bg-[#0b5a45] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#094635]';
export const adminSecondaryButtonClassName =
  'inline-flex min-h-12 items-center justify-center rounded-full border border-[#0b5a45]/14 bg-white px-5 py-3 text-sm font-semibold text-[#0b3e31] transition hover:border-[#0b5a45]/30 hover:bg-[#eef4ef]';
export const adminGhostLinkClassName =
  'inline-flex min-h-11 items-center justify-center rounded-full border border-[#0b5a45]/14 bg-white/80 px-5 py-3 text-sm font-semibold text-[#0b3e31] transition hover:border-[#0b5a45]/28 hover:bg-white';
export const adminInlineLinkClassName =
  'text-sm font-semibold text-[#0b5a45] underline-offset-4 transition hover:underline';
export const adminBadgeClassName =
  'inline-flex items-center rounded-full border border-[#0b5a45]/10 bg-[#eef4ef] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0b5a45]';
