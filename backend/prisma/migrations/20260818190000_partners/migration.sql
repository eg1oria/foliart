CREATE TABLE "Partner" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "phones" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "Partner_sortOrder_idx" ON "Partner"("sortOrder");

-- The partner card that used to be hard-coded on /about/partnery, so the page
-- keeps showing it once it starts rendering from the database.
INSERT INTO "Partner" ("name", "logoUrl", "address", "phones", "email", "website", "sortOrder", "createdAt", "updatedAt")
VALUES (
    'ООО "ЭкоГрин"',
    '/partners2.webp',
    'г.Краснодар',
    '+7 (861) 224-75-37' || char(10) || '+7 (989) 802 43 78',
    'info@ecogreen.ru',
    'https://ecogreen.ru',
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
