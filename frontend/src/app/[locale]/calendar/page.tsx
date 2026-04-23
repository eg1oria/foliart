import MediaImage from '@/components/catalog/MediaImage';
import { Link } from '@/i18n/routing';
import { getCalendars } from '@/lib/api';
import { getCalendarsCopy, getCalendarHref, getCalendarImages } from '@/lib/calendars';
import { resolveMediaUrl } from '@/lib/media';

function shortenText(value: string, limit: number) {
  const normalized = value.trim();

  if (normalized.length <= limit) {
    return normalized;
  }

  return `${normalized.slice(0, limit).trimEnd()}...`;
}

export default async function CalendarPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const copy = getCalendarsCopy(locale);
  const calendars = await getCalendars(locale);
  const heroImage = resolveMediaUrl(
    calendars.length > 0 ? getCalendarImages(calendars[0])[0] : null,
  );

  return (
    <main className="pb-24">
      <section className="relative flex min-h-[380px] flex-col justify-end overflow-hidden px-6 px-90 pb-16 pt-60">
        <div className="absolute inset-0">
          <MediaImage
            src={heroImage}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
            emptyState={
              <div className="h-full w-full bg-[linear-gradient(135deg,#4d6b3c,#234d31,#0b3125)]" />
            }
          />
        </div>
        <div className="absolute inset-0 bg-black/50" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent" />

        <div className="relative z-10 max-w-4xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.28em] text-[#d6e7d0]">
            {copy.heroEyebrow}
          </p>
          <h1 className="text-4xl font-bold text-white md:text-5xl">{copy.title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/80 md:text-lg">
            {copy.subtitle}
          </p>
        </div>
      </section>

      <section className="px-6 px-90 py-16">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#6d826e]">
              {copy.listEyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-[#10283d] md:text-4xl">
              {copy.title}
            </h2>
          </div>
        </div>

        {calendars.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-[#0b5a45]/20 bg-[#f7f6f1] px-8 py-16 text-center text-base text-[#5f726b]">
            {copy.emptyState}
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {calendars.map((calendar, index) => {
              const coverImage = resolveMediaUrl(getCalendarImages(calendar)[0]);

              return (
                <Link
                  key={calendar.id}
                  href={getCalendarHref(calendar)}
                  className="group overflow-hidden rounded-[2rem] border border-[#dbe4db] bg-white shadow-[0_28px_70px_-52px_rgba(11,62,49,0.75)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_34px_90px_-48px_rgba(11,62,49,0.55)]">
                  <article className="flex h-full flex-col">
                    <div className="relative aspect-[16/10] overflow-hidden bg-[#e8efe8]">
                      <MediaImage
                        src={coverImage}
                        alt={calendar.title}
                        fill
                        priority={index === 0}
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        className="object-cover transition duration-500 group-hover:scale-[1.04]"
                        emptyState={
                          <div className="h-full w-full bg-[linear-gradient(135deg,#dce8d8,#acc7a8,#5f845f)]" />
                        }
                      />
                    </div>

                    <div className="flex flex-1 flex-col px-7 py-7">
                      <h3 className="text-2xl font-semibold text-[#10283d] transition group-hover:text-[#0b5a45]">
                        {calendar.title}
                      </h3>
                      <p className="mt-4 flex-1 text-sm leading-7 text-[#5a6c72]">
                        {shortenText(calendar.description, 210)}
                      </p>
                      <div className="mt-6 inline-flex items-center text-sm font-semibold text-[#0b5a45]">
                        {copy.openEntry}
                      </div>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
