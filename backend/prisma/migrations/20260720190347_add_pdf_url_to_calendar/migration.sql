-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Article" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT,
    "title" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL DEFAULT '',
    "excerpt" TEXT NOT NULL DEFAULT '',
    "excerptEn" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,
    "contentEn" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL,
    "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "coverMediaId" TEXT,
    "imageLayoutJson" JSONB,
    "imageLayoutRevision" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Article" ("content", "contentEn", "coverMediaId", "excerpt", "excerptEn", "id", "imageLayoutJson", "imageLayoutRevision", "imageUrl", "publishedAt", "slug", "title", "titleEn", "updatedAt", "viewCount") SELECT "content", "contentEn", "coverMediaId", "excerpt", "excerptEn", "id", "imageLayoutJson", "imageLayoutRevision", "imageUrl", "publishedAt", "slug", "title", "titleEn", "updatedAt", "viewCount" FROM "Article";
DROP TABLE "Article";
ALTER TABLE "new_Article" RENAME TO "Article";
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");
CREATE TABLE "new_ArticleTranslation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "articleId" INTEGER NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "excerpt" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "contentJson" JSONB,
    "contentSchemaVersion" INTEGER,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ArticleTranslation_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ArticleTranslation" ("articleId", "content", "contentJson", "contentSchemaVersion", "excerpt", "id", "locale", "revision", "title", "updatedAt") SELECT "articleId", "content", "contentJson", "contentSchemaVersion", "excerpt", "id", "locale", "revision", "title", "updatedAt" FROM "ArticleTranslation";
DROP TABLE "ArticleTranslation";
ALTER TABLE "new_ArticleTranslation" RENAME TO "ArticleTranslation";
CREATE INDEX "ArticleTranslation_locale_idx" ON "ArticleTranslation"("locale");
CREATE UNIQUE INDEX "ArticleTranslation_articleId_locale_key" ON "ArticleTranslation"("articleId", "locale");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
