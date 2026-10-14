-- The band under the site header of an embedded page: its colour, and whether
-- it carries the page title.
ALTER TABLE "SitePage" ADD COLUMN "showTitle" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SitePage" ADD COLUMN "bandColor" TEXT NOT NULL DEFAULT '#0e2438';
