-- Catalog products a crop calendar recommends: the link between the calendar
-- and the catalog. Language-independent, ordered by the moment of application.
CREATE TABLE "CalendarEntryProduct" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "calendarEntryId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CalendarEntryProduct_calendarEntryId_fkey" FOREIGN KEY ("calendarEntryId") REFERENCES "CalendarEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CalendarEntryProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CalendarEntryProduct_calendarEntryId_productId_key" ON "CalendarEntryProduct"("calendarEntryId", "productId");

CREATE INDEX "CalendarEntryProduct_calendarEntryId_sortOrder_idx" ON "CalendarEntryProduct"("calendarEntryId", "sortOrder");

-- The products named on the scheme image of each existing calendar, matched by
-- slug so a database without one of these entries simply gets no row for it.
INSERT OR IGNORE INTO "CalendarEntryProduct" ("calendarEntryId", "productId", "sortOrder")
SELECT "CalendarEntry"."id", "Product"."id", "link"."sortOrder"
FROM (
    SELECT 'ozimaya-pshenitsa' AS "calendarSlug", 'gel-prilipatel-rastekatel' AS "productSlug", 0 AS "sortOrder"
    UNION ALL SELECT 'ozimaya-pshenitsa', 'riza', 1
    UNION ALL SELECT 'ozimaya-pshenitsa', 'vsg-30', 2
    UNION ALL SELECT 'ozimaya-pshenitsa', 'floema', 3
    UNION ALL SELECT 'ozimaya-pshenitsa', 'senikant', 4
    UNION ALL SELECT 'kukuruza', 'p-k-mn', 0
    UNION ALL SELECT 'kukuruza', 'zn-160-aminohelat', 1
    UNION ALL SELECT 'kukuruza', 'magniy-aminohelat', 2
    UNION ALL SELECT 'kukuruza', 'kaltsiy-aminohelat', 3
    UNION ALL SELECT 'kukuruza', 'bor-amino', 4
    UNION ALL SELECT 'kukuruza', 'kaliy-450', 5
    UNION ALL SELECT 'kukuruza', 'vsg-30', 6
    UNION ALL SELECT 'kukuruza', 'senikant', 7
    UNION ALL SELECT 'saharnaya-svyokla', 'p-k-mn', 0
    UNION ALL SELECT 'saharnaya-svyokla', 'verayzon', 1
    UNION ALL SELECT 'saharnaya-svyokla', 'kaltsiy-aminohelat', 2
    UNION ALL SELECT 'saharnaya-svyokla', 'bor-amino', 3
    UNION ALL SELECT 'saharnaya-svyokla', 'vsg-30-ca', 4
    UNION ALL SELECT 'saharnaya-svyokla', 'senikant', 5
    UNION ALL SELECT 'soya', 'molibden-83', 0
    UNION ALL SELECT 'soya', 'gel-prilipatel-rastekatel', 1
    UNION ALL SELECT 'soya', 'profi-kompleks', 2
    UNION ALL SELECT 'soya', 'kaltsiy-aminohelat', 3
    UNION ALL SELECT 'soya', 'bor-amino', 4
    UNION ALL SELECT 'soya', 'vsg-30-ca', 5
    UNION ALL SELECT 'soya', 'sera-3625', 6
    UNION ALL SELECT 'soya', 'kaliy-450', 7
    UNION ALL SELECT 'soya', 'vsg-30', 8
    UNION ALL SELECT 'soya', 'senikant', 9
    UNION ALL SELECT 'podsolnechnik', 'verayzon', 0
    UNION ALL SELECT 'podsolnechnik', 'gel-prilipatel-rastekatel', 1
    UNION ALL SELECT 'podsolnechnik', 'profi-kompleks', 2
    UNION ALL SELECT 'podsolnechnik', 'kaltsiy-aminohelat', 3
    UNION ALL SELECT 'podsolnechnik', 'bor-amino', 4
    UNION ALL SELECT 'podsolnechnik', 'vsg-30', 5
    UNION ALL SELECT 'podsolnechnik', 'senikant', 6
) AS "link"
JOIN "CalendarEntry" ON "CalendarEntry"."slug" = "link"."calendarSlug"
JOIN "Product" ON "Product"."slug" = "link"."productSlug";
