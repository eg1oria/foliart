-- Files attached to a single product: several per product, each with its own
-- visible title, and a separate set per content locale.
CREATE TABLE "ProductDocument" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT '',
    "originalName" TEXT NOT NULL DEFAULT '',
    "byteSize" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductDocument_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ProductDocument_productId_locale_idx" ON "ProductDocument"("productId", "locale");

CREATE INDEX "ProductDocument_sortOrder_idx" ON "ProductDocument"("sortOrder");
