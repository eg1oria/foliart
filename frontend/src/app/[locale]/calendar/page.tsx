import MediaImage from '@/components/catalog/MediaImage';
import { Link } from '@/i18n/routing';
import { getCalendars } from '@/lib/api';
import {
  getCalendarHref,
  getCalendarsCopy,
  getCalendarImages,
} from '@/lib/calendars';
import { resolveMediaUrl } from '@/lib/media';

export default async function CalendarPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const copy = getCalendarsCopy(locale);
  const calendars = await getCalendars(locale);

  return (
    <main className="pb-24">
      <section className="catalog-header pt-30 md:pt-60">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-[#6f7f77]">
          {copy.listEyebrow}
        </p>
        <h1 className="mt-4 text-3xl font-bold text-[#0e2438] md:text-5xl">{copy.title}</h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-[#556970] md:text-lg">
          {copy.subtitle}
        </p>
      </section>

      <section className="catalog-header py-10">
        {calendars.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-[#0b5a45]/20 bg-[#f7f6f1] px-8 py-16 text-center text-base text-[#5f726b]">
            {copy.emptyState}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {calendars.map((calendar) => {
              const previewImage = resolveMediaUrl(getCalendarImages(calendar)[0]);

              return (
                <Link
                  key={calendar.id}
                  href={getCalendarHref(calendar)}
                  className="group flex h-full flex-col overflow-hidden bg-[#eff3ef]">
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#edf2ee]">
                    <MediaImage
                      src={previewImage}
                      alt={calendar.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      className="object-cover transition duration-500 group-hover:scale-[1.04]"
                      emptyState={
                        <div className="h-full w-full bg-[linear-gradient(135deg,#dfe9df,#b1c9b3,#6d8f70)]" />
                      }
                    />
                  </div>

                  <article className="flex flex-1 flex-col p-6">
                    <p className="text-xs font-medium uppercase tracking-[0.24em] text-[#6f7f77]">
                      {copy.heroEyebrow}
                    </p>
                    <h2 className="mt-4 text-[1.35rem] font-semibold leading-tight text-[#10283d] transition group-hover:text-[#0b5a45]">
                      {calendar.title}
                    </h2>
                    <p className="mt-4 line-clamp-3 text-[0.95rem] leading-7 text-[#53646b]">
                      {calendar.description || copy.detailsEmpty}
                    </p>
                    <span className="mt-6 inline-flex text-[1rem] font-medium text-[#0b5a45]">
                      {copy.openEntry}
                    </span>
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
