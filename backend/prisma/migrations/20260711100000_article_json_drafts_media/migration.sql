-- Additive article JSON migration. Legacy HTML columns intentionally remain.
ALTER TABLE "Article" ADD COLUMN "slug" TEXT;
ALTER TABLE "Article" ADD COLUMN "coverMediaId" TEXT;
ALTER TABLE "Article" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';

ALTER TABLE "ArticleTranslation" ADD COLUMN "contentJson" JSONB;
ALTER TABLE "ArticleTranslation" ADD COLUMN "contentSchemaVersion" INTEGER;
ALTER TABLE "ArticleTranslation" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ArticleTranslation" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';

UPDATE "Article" SET "updatedAt" = CURRENT_TIMESTAMP;
UPDATE "ArticleTranslation" SET "updatedAt" = CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

CREATE TABLE "ArticleDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "articleId" INTEGER,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "excerpt" TEXT NOT NULL DEFAULT '',
    "contentJson" JSONB NOT NULL,
    "contentSchemaVersion" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "coverMediaId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ArticleDraft_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ArticleDraft_articleId_locale_key" ON "ArticleDraft"("articleId", "locale");
CREATE INDEX "ArticleDraft_locale_idx" ON "ArticleDraft"("locale");
CREATE INDEX "ArticleDraft_updatedAt_idx" ON "ArticleDraft"("updatedAt");

CREATE TABLE "ArticleMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uploadId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "articleId" INTEGER,
    "draftId" TEXT,
    "storagePath" TEXT NOT NULL,
    "previewPath" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "previewUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "pages" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ArticleMedia_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ArticleMedia_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ArticleDraft" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ArticleMedia_uploadId_key" ON "ArticleMedia"("uploadId");
CREATE UNIQUE INDEX "ArticleMedia_storagePath_key" ON "ArticleMedia"("storagePath");
CREATE UNIQUE INDEX "ArticleMedia_previewPath_key" ON "ArticleMedia"("previewPath");
CREATE UNIQUE INDEX "ArticleMedia_publicUrl_key" ON "ArticleMedia"("publicUrl");
CREATE UNIQUE INDEX "ArticleMedia_previewUrl_key" ON "ArticleMedia"("previewUrl");
CREATE INDEX "ArticleMedia_articleId_idx" ON "ArticleMedia"("articleId");
CREATE INDEX "ArticleMedia_draftId_idx" ON "ArticleMedia"("draftId");
CREATE INDEX "ArticleMedia_status_idx" ON "ArticleMedia"("status");
