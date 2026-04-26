import type { Metadata } from 'next';
import MediaImage from '@/components/catalog/MediaImage';
import { getCalendars } from '@/lib/api';
import {
  findCalendarByParam,
  getCalendarsCopy,
  getCalendarHref,
  getCalendarImageSlots,
  getCalendarSlug,
} from '@/lib/calendars';
import { resolveMediaUrl } from '@/lib/media';
import { buildBreadcrumbSchema, buildPageMetadata, stringifyJsonLd } from '@/lib/seo';
import { notFound, redirect } from 'next/navigation';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; calendarId: string }>;
}): Promise<Metadata> {
  const { locale, calendarId: rawCalendarId } = await params;
  const copy = getCalendarsCopy(locale);
  const calendars = await getCalendars(locale).catch(() => []);
  const calendar = findCalendarByParam(calendars, rawCalendarId);

  if (!calendar) {
    return buildPageMetadata({
      locale,
      path: '/calendar',
      title: locale === 'en' ? 'Agricultural calendar' : 'Сельскохозяйственный календарь',
      description: copy.subtitle,
      image: '/articles-head.webp',
    });
  }

  return buildPageMetadata({
    locale,
    path: getCalendarHref(calendar),
    title: calendar.title,
    description: calendar.description || copy.detailsEmpty,
    image: resolveMediaUrl(getCalendarImageSlots(calendar).heroImage),
  });
}

export default async function CalendarDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; calendarId: string }>;
}) {
  const { locale, calendarId: rawCalendarId } = await params;
  const copy = getCalendarsCopy(locale);
  const calendars = await getCalendars(locale);
  const calendar = findCalendarByParam(calendars, rawCalendarId);

  if (!calendar) {
    notFound();
  }

  if (rawCalendarId !== getCalendarSlug(calendar)) {
    redirect(`/${locale}${getCalendarHref(calendar)}`);
  }

  const {
    heroImage: heroImagePath,
    detailsImage: detailsImagePath,
    showcaseImage: showcaseImagePath,
    showcaseBackgroundImage: showcaseBackgroundImagePath,
  } = getCalendarImageSlots(calendar);
  const heroImage = resolveMediaUrl(heroImagePath);
  const detailsImage = resolveMediaUrl(detailsImagePath);
  const showcaseImage = resolveMediaUrl(showcaseImagePath);
  const showcaseBackgroundImage = resolveMediaUrl(showcaseBackgroundImagePath);
  const viewCalendarLabel = locale === 'en' ? 'View calendar' : 'Смотреть календарь';
  const calendarPath = getCalendarHref(calendar);
  const breadcrumbSchema = buildBreadcrumbSchema(locale, [
    { name: locale === 'en' ? 'Home' : 'Главная', path: '/' },
    { name: locale === 'en' ? 'Calendar' : 'Календарь', path: '/calendar' },
    { name: calendar.title, path: calendarPath },
  ]);

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(breadcrumbSchema) }}
      />
      <section className="catalog-header relative flex flex-col justify-center overflow-hidden px-6 pb-16 pt-30 md:pt-60">
        <div className="absolute inset-0">
          <MediaImage
            src={heroImage}
            alt={calendar.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
            emptyState={
              <div className="h-full w-full bg-[linear-gradient(135deg,#dde7df,#adc4af,#77957a)]" />
            }
          />
        </div>
        <div className="absolute inset-0 bg-black/50" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent" />

        <h1 className="relative z-10 py-0 text-3xl text-center font-bold leading-[1.18] text-white md:py-10 md:text-5xl">
          {calendar.title}
        </h1>
      </section>

      <section className="catalog-header py-0 md:py-8">
        <article>
          <div className="mt-8 grid items-center gap-8 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)]">
            <div className="order-2 relative min-h-[280px] overflow-hidden bg-[#eef3ef] lg:order-1">
              <MediaImage
                src={detailsImage}
                alt={calendar.title}
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
                emptyState={
                  <div className=" w-full aspect-[16/9] bg-[linear-gradient(135deg,#dfe9df,#b1c9b3,#6d8f70)]" />
                }
              />
            </div>

            <p className="order-1 whitespace-pre-line leading-6 text-[#556970] lg:order-2">
              {calendar.description || copy.detailsEmpty}
            </p>
          </div>
        </article>
      </section>

      {showcaseImage ? (
        <div className="relative overflow-hidden px-4 py-10 sm:px-6 md:px-10 md:py-16">
          <div className="absolute inset-0">
            <MediaImage
              src={showcaseBackgroundImage}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
              emptyState={
                <div className="h-full w-full bg-[linear-gradient(135deg,#e8efe2,#c5d6ba,#93aa8a)]" />
              }
            />
          </div>
          <div className="absolute inset-0 bg-white/70" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.35),rgba(244,248,241,0.4))]" />

          <div className="relative z-10 mx-auto flex w-full max-w-[980px] flex-col items-center">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.5rem]">
              <MediaImage
                src={showcaseImage}
                alt={calendar.title}
                fill
                sizes="(max-width: 980px) 100vw, 980px"
                className="object-contain p-5"
                emptyState={
                  <div className="h-full w-full bg-[linear-gradient(135deg,#fbfcfa,#e5eee1,#d1ddcb)]" />
                }
              />
            </div>

            <a
              href={showcaseImage}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex items-center rounded-full bg-[#014c3c] px-8 py-4 text-base font-semibold text-white transition hover:bg-[#013a2e]">
              {viewCalendarLabel}
            </a>
          </div>
        </div>
      ) : null}
    </main>
  );
}
