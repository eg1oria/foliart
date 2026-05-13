-- CreateTable
CREATE TABLE "CategoryTranslation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "categoryId" INTEGER NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "CategoryTranslation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductTranslation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "advantages" TEXT NOT NULL DEFAULT '',
    "composition" TEXT NOT NULL DEFAULT '',
    "application" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "ProductTranslation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ArticleTranslation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "articleId" INTEGER NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "excerpt" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "ArticleTranslation_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CalendarEntryTranslation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "calendarEntryId" INTEGER NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "CalendarEntryTranslation_calendarEntryId_fkey" FOREIGN KEY ("calendarEntryId") REFERENCES "CalendarEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryTranslation_categoryId_locale_key" ON "CategoryTranslation"("categoryId", "locale");

-- CreateIndex
CREATE INDEX "CategoryTranslation_locale_idx" ON "CategoryTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTranslation_productId_locale_key" ON "ProductTranslation"("productId", "locale");

-- CreateIndex
CREATE INDEX "ProductTranslation_locale_idx" ON "ProductTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleTranslation_articleId_locale_key" ON "ArticleTranslation"("articleId", "locale");

-- CreateIndex
CREATE INDEX "ArticleTranslation_locale_idx" ON "ArticleTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEntryTranslation_calendarEntryId_locale_key" ON "CalendarEntryTranslation"("calendarEntryId", "locale");

-- CreateIndex
CREATE INDEX "CalendarEntryTranslation_locale_idx" ON "CalendarEntryTranslation"("locale");

-- Backfill Russian source content.
INSERT INTO "CategoryTranslation" ("categoryId", "locale", "name", "description")
SELECT "id", 'ru', "name", "description" FROM "Category";

INSERT INTO "ProductTranslation" (
    "productId",
    "locale",
    "name",
    "description",
    "advantages",
    "composition",
    "application"
)
SELECT
    "id",
    'ru',
    "name",
    "description",
    "advantages",
    "composition",
    "application"
FROM "Product";

INSERT INTO "ArticleTranslation" ("articleId", "locale", "title", "excerpt", "content")
SELECT "id", 'ru', "title", "excerpt", "content" FROM "Article";

INSERT INTO "CalendarEntryTranslation" (
    "calendarEntryId",
    "locale",
    "title",
    "description"
)
SELECT "id", 'ru', "title", "description" FROM "CalendarEntry";

-- Backfill existing English columns. Blank rows are intentional so the admin
-- can show empty English inputs without falling back inside the form.
INSERT INTO "CategoryTranslation" ("categoryId", "locale", "name", "description")
SELECT "id", 'en', "nameEn", "descriptionEn" FROM "Category";

INSERT INTO "ProductTranslation" (
    "productId",
    "locale",
    "name",
    "description",
    "advantages",
    "composition",
    "application"
)
SELECT
    "id",
    'en',
    "nameEn",
    "descriptionEn",
    "advantagesEn",
    "compositionEn",
    "applicationEn"
FROM "Product";

INSERT INTO "ArticleTranslation" ("articleId", "locale", "title", "excerpt", "content")
SELECT "id", 'en', "titleEn", "excerptEn", "contentEn" FROM "Article";

INSERT INTO "CalendarEntryTranslation" (
    "calendarEntryId",
    "locale",
    "title",
    "description"
)
SELECT "id", 'en', "titleEn", "descriptionEn" FROM "CalendarEntry";
