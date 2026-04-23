-- CreateTable
CREATE TABLE "CalendarEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "imageUrl1" TEXT NOT NULL,
    "imageUrl2" TEXT NOT NULL,
    "imageUrl3" TEXT NOT NULL,
    "imageUrl4" TEXT NOT NULL
);
