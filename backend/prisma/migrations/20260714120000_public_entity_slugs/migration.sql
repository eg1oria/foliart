-- Persist the canonical public URL segment for catalog and calendar entities.
-- The temporary table lets us reproduce the existing frontend transliteration
-- before rebuilding the SQLite tables with required, unique slug columns.
CREATE TABLE "_PublicSlugSource" (
    "entity" TEXT NOT NULL,
    "recordId" INTEGER NOT NULL,
    "sourceValue" TEXT NOT NULL,
    PRIMARY KEY ("entity", "recordId")
);

INSERT INTO "_PublicSlugSource" ("entity", "recordId", "sourceValue")
SELECT 'category', "id", trim("name") FROM "Category";

INSERT INTO "_PublicSlugSource" ("entity", "recordId", "sourceValue")
SELECT 'product', "id", trim("name") FROM "Product";

INSERT INTO "_PublicSlugSource" ("entity", "recordId", "sourceValue")
SELECT 'calendar', "id", trim("title") FROM "CalendarEntry";

-- Cyrillic transliteration used by frontend/src/lib/catalog.ts.
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'а', 'a'), 'А', 'a');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'б', 'b'), 'Б', 'b');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'в', 'v'), 'В', 'v');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'г', 'g'), 'Г', 'g');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'д', 'd'), 'Д', 'd');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'е', 'e'), 'Е', 'e');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'ё', 'yo'), 'Ё', 'yo');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'ж', 'zh'), 'Ж', 'zh');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'з', 'z'), 'З', 'z');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'и', 'i'), 'И', 'i');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'й', 'y'), 'Й', 'y');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'к', 'k'), 'К', 'k');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'л', 'l'), 'Л', 'l');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'м', 'm'), 'М', 'm');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'н', 'n'), 'Н', 'n');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'о', 'o'), 'О', 'o');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'п', 'p'), 'П', 'p');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'р', 'r'), 'Р', 'r');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'с', 's'), 'С', 's');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'т', 't'), 'Т', 't');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'у', 'u'), 'У', 'u');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'ф', 'f'), 'Ф', 'f');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'х', 'h'), 'Х', 'h');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'ц', 'ts'), 'Ц', 'ts');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'ч', 'ch'), 'Ч', 'ch');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'ш', 'sh'), 'Ш', 'sh');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'щ', 'sch'), 'Щ', 'sch');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'ъ', ''), 'Ъ', '');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'ы', 'y'), 'Ы', 'y');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'ь', ''), 'Ь', '');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'э', 'e'), 'Э', 'e');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'ю', 'yu'), 'Ю', 'yu');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'я', 'ya'), 'Я', 'ya');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'і', 'i'), 'І', 'i');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'ї', 'yi'), 'Ї', 'yi');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'є', 'ye'), 'Є', 'ye');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'ґ', 'g'), 'Ґ', 'g');

-- Common precomposed Latin characters that JavaScript NFKD turns into ASCII.
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace("sourceValue", 'à', 'a'), 'á', 'a'), 'â', 'a'), 'ã', 'a'), 'ä', 'a'), 'å', 'a'), 'À', 'a'), 'Á', 'a'), 'Â', 'a'), 'Ã', 'a'), 'Ä', 'a'), 'Å', 'a');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'ç', 'c'), 'Ç', 'c');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace(replace(replace(replace(replace(replace(replace("sourceValue", 'è', 'e'), 'é', 'e'), 'ê', 'e'), 'ë', 'e'), 'È', 'e'), 'É', 'e'), 'Ê', 'e'), 'Ë', 'e');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace(replace(replace(replace(replace(replace(replace("sourceValue", 'ì', 'i'), 'í', 'i'), 'î', 'i'), 'ï', 'i'), 'Ì', 'i'), 'Í', 'i'), 'Î', 'i'), 'Ï', 'i');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace("sourceValue", 'ñ', 'n'), 'Ñ', 'n');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace("sourceValue", 'ò', 'o'), 'ó', 'o'), 'ô', 'o'), 'õ', 'o'), 'ö', 'o'), 'Ò', 'o'), 'Ó', 'o'), 'Ô', 'o'), 'Õ', 'o'), 'Ö', 'o');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace(replace(replace(replace(replace(replace(replace("sourceValue", 'ù', 'u'), 'ú', 'u'), 'û', 'u'), 'ü', 'u'), 'Ù', 'u'), 'Ú', 'u'), 'Û', 'u'), 'Ü', 'u');
UPDATE "_PublicSlugSource" SET "sourceValue" = replace(replace(replace("sourceValue", 'ý', 'y'), 'ÿ', 'y'), 'Ý', 'y');

CREATE TABLE "_PublicSlugBackfill" (
    "entity" TEXT NOT NULL,
    "recordId" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    PRIMARY KEY ("entity", "recordId")
);

WITH RECURSIVE "slugCharacters" (
    "entity",
    "recordId",
    "sourceValue",
    "position",
    "slug",
    "lastWasSeparator"
) AS (
    SELECT "entity", "recordId", "sourceValue", 1, '', 1
    FROM "_PublicSlugSource"
    UNION ALL
    SELECT
        "entity",
        "recordId",
        "sourceValue",
        "position" + 1,
        CASE
            WHEN substr("sourceValue", "position", 1) GLOB '[A-Za-z0-9]'
                THEN "slug" || lower(substr("sourceValue", "position", 1))
            WHEN substr("sourceValue", "position", 1) IN (' ', '-', char(9), char(10), char(13))
                 AND "slug" <> '' AND "lastWasSeparator" = 0
                THEN "slug" || '-'
            ELSE "slug"
        END,
        CASE
            WHEN substr("sourceValue", "position", 1) GLOB '[A-Za-z0-9]' THEN 0
            WHEN substr("sourceValue", "position", 1) IN (' ', '-', char(9), char(10), char(13)) THEN 1
            ELSE "lastWasSeparator"
        END
    FROM "slugCharacters"
    WHERE "position" <= length("sourceValue")
)
INSERT INTO "_PublicSlugBackfill" ("entity", "recordId", "slug")
SELECT
    "entity",
    "recordId",
    CASE WHEN rtrim("slug", '-') = '' THEN 'item' ELSE rtrim("slug", '-') END
FROM "slugCharacters"
WHERE "position" > length("sourceValue");

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL,
    "productCount" INTEGER NOT NULL DEFAULT 0
);

INSERT INTO "new_Category" ("id", "slug", "name", "nameEn", "description", "descriptionEn", "imageUrl", "productCount")
SELECT c."id", s."slug", c."name", c."nameEn", c."description", c."descriptionEn", c."imageUrl", c."productCount"
FROM "Category" c
JOIN "_PublicSlugBackfill" s ON s."entity" = 'category' AND s."recordId" = c."id";

DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "advantages" TEXT NOT NULL,
    "advantagesEn" TEXT NOT NULL DEFAULT '',
    "composition" TEXT NOT NULL DEFAULT '',
    "compositionEn" TEXT NOT NULL DEFAULT '',
    "application" TEXT NOT NULL DEFAULT '',
    "applicationEn" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL,
    "imageUrlEn" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Product" ("id", "slug", "categoryId", "name", "nameEn", "description", "descriptionEn", "advantages", "advantagesEn", "composition", "compositionEn", "application", "applicationEn", "imageUrl", "imageUrlEn")
SELECT p."id", s."slug", p."categoryId", p."name", p."nameEn", p."description", p."descriptionEn", p."advantages", p."advantagesEn", p."composition", p."compositionEn", p."application", p."applicationEn", p."imageUrl", p."imageUrlEn"
FROM "Product" p
JOIN "_PublicSlugBackfill" s ON s."entity" = 'product' AND s."recordId" = p."id";

DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

CREATE TABLE "new_CalendarEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "imageUrl1" TEXT NOT NULL,
    "imageUrl2" TEXT NOT NULL,
    "imageUrl3" TEXT NOT NULL,
    "imageUrl4" TEXT NOT NULL
);

INSERT INTO "new_CalendarEntry" ("id", "slug", "title", "titleEn", "description", "descriptionEn", "imageUrl1", "imageUrl2", "imageUrl3", "imageUrl4")
SELECT c."id", s."slug", c."title", c."titleEn", c."description", c."descriptionEn", c."imageUrl1", c."imageUrl2", c."imageUrl3", c."imageUrl4"
FROM "CalendarEntry" c
JOIN "_PublicSlugBackfill" s ON s."entity" = 'calendar' AND s."recordId" = c."id";

DROP TABLE "CalendarEntry";
ALTER TABLE "new_CalendarEntry" RENAME TO "CalendarEntry";
CREATE UNIQUE INDEX "CalendarEntry_slug_key" ON "CalendarEntry"("slug");

DROP TABLE "_PublicSlugBackfill";
DROP TABLE "_PublicSlugSource";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
