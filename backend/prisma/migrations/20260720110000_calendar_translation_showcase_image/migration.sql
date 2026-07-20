-- Allow the large calendar showcase image (photo 3) to be customized per content locale.
ALTER TABLE "CalendarEntryTranslation" ADD COLUMN "imageUrl3" TEXT NOT NULL DEFAULT '';

-- Preserve the existing Russian/base showcase image for the default translation.
UPDATE "CalendarEntryTranslation"
SET "imageUrl3" = (
    SELECT "CalendarEntry"."imageUrl3"
    FROM "CalendarEntry"
    WHERE "CalendarEntry"."id" = "CalendarEntryTranslation"."calendarEntryId"
)
WHERE "locale" = 'ru';
