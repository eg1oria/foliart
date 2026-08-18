CREATE TABLE "RegionalContact" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "region" TEXT NOT NULL,
    "fullName" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "RegionalContact_sortOrder_idx" ON "RegionalContact"("sortOrder");
