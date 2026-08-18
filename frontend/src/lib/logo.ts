const LOGO_SOURCES = {
  ru: { src: '/logo-ru.webp', aspectRatio: 1280 / 691 },
  intl: { src: '/logo-en.webp', aspectRatio: 1280 / 763 },
} as const;

// next/image builds its srcset from the intrinsic `width`, so every distinct
// width is a separate download. Header, sticky header, fullscreen menu and the
// about page therefore all ask for the same base width and scale with CSS,
// which keeps them on one cached request.
export const DEFAULT_LOGO_WIDTH = 135;

export type FullLogo = {
  src: string;
  width: number;
  height: number;
};

export function getFullLogo(locale: string, width: number = DEFAULT_LOGO_WIDTH): FullLogo {
  const source = locale === 'ru' ? LOGO_SOURCES.ru : LOGO_SOURCES.intl;
  return { src: source.src, width, height: Math.round(width / source.aspectRatio) };
}
