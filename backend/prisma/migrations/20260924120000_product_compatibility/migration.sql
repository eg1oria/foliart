-- AlterTable
ALTER TABLE "Product" ADD COLUMN "compatibility" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "ProductTranslation" ADD COLUMN "compatibility" TEXT NOT NULL DEFAULT '';
