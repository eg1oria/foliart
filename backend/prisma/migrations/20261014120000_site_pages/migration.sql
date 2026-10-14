-- Pages built in the admin from pasted HTML, one translation per language.
CREATE TABLE "SitePage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "displayMode" TEXT NOT NULL DEFAULT 'embedded',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "SitePage_slug_key" ON "SitePage"("slug");

CREATE TABLE "SitePageTranslation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pageId" INTEGER NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "html" TEXT NOT NULL DEFAULT '',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SitePageTranslation_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "SitePage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SitePageTranslation_pageId_locale_key" ON "SitePageTranslation"("pageId", "locale");
CREATE INDEX "SitePageTranslation_locale_idx" ON "SitePageTranslation"("locale");

CREATE TABLE "SitePageImage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pageId" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "originalName" TEXT NOT NULL DEFAULT '',
    "width" INTEGER NOT NULL DEFAULT 0,
    "height" INTEGER NOT NULL DEFAULT 0,
    "byteSize" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SitePageImage_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "SitePage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "SitePageImage_pageId_idx" ON "SitePageImage"("pageId");
