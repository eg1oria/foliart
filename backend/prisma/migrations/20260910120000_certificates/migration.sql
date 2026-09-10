CREATE TABLE "Certificate" (
    "slug" TEXT NOT NULL PRIMARY KEY,
    "fileUrl" TEXT NOT NULL DEFAULT '',
    "mimeType" TEXT NOT NULL DEFAULT '',
    "originalName" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- The conformity certificate starts empty: the catalog keeps linking the
-- bundled `/sertificate.webp` scan until an admin uploads a replacement.
INSERT INTO "Certificate" ("slug", "fileUrl", "mimeType", "originalName", "createdAt", "updatedAt")
VALUES ('conformity', '', '', '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
