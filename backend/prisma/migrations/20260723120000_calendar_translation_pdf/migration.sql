-- Allow each calendar content locale to use its own PDF.
ALTER TABLE "CalendarEntryTranslation" ADD COLUMN "pdfUrl" TEXT NOT NULL DEFAULT '';

-- Preserve the existing Russian/base PDF for the default translation.
UPDATE "CalendarEntryTranslation"
SET "pdfUrl" = (
    SELECT "CalendarEntry"."pdfUrl"
    FROM "CalendarEntry"
    WHERE "CalendarEntry"."id" = "CalendarEntryTranslation"."calendarEntryId"
)
WHERE "locale" = 'ru';
