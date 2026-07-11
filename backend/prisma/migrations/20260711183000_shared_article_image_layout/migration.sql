-- Shared image placement across all localized article documents.
ALTER TABLE "Article" ADD COLUMN "imageLayoutJson" JSONB;
ALTER TABLE "Article" ADD COLUMN "imageLayoutRevision" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ArticleDraft" ADD COLUMN "imageLayoutRevision" INTEGER NOT NULL DEFAULT 0;
