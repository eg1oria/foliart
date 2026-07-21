import { getCalendars } from '@/lib/api';

// Страница выводит СПИСОК всех календарей на французском (contentLocale = 'fr'):
// заголовок, описание и ссылка на PDF (если есть).
//
// Разместите файл ВНУТРИ сегмента [locale], например:
//   app/[locale]/fr-calendars/page.tsx
// (иначе будет ошибка "Missing <html> and <body> tags" —
// корневой layout с <html>/<body> находится в app/[locale]/layout.tsx)

export default async function CalendarsFrenchListPage() {
  const calendars = await getCalendars('fr', undefined, 'fr');

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-semibold text-[#0b5a45]">Calendriers</h1>

      {calendars.length === 0 ? (
        <p className="italic text-[#8a978f]">Aucun calendrier disponible pour le moment.</p>
      ) : (
        <div className="space-y-10">
          {calendars.map((calendar) => (
            <article
              key={calendar.id}
              className="rounded-lg border border-[#0b5a45]/10 bg-white p-6">
              <h2 className="mb-3 text-xl font-semibold text-[#0b5a45]">{calendar.title}</h2>

              {calendar.description ? (
                <p className="whitespace-pre-line text-[#3b4a45] leading-relaxed">
                  {calendar.description}
                </p>
              ) : (
                <p className="italic text-[#8a978f]">
                  Cette section n&apos;est pas encore renseignée en français.
                </p>
              )}

              {calendar.pdfUrl ? (
                <a
                  href={calendar.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-sm font-semibold text-[#0b5a45] underline underline-offset-2">
                  Télécharger le PDF
                </a>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
