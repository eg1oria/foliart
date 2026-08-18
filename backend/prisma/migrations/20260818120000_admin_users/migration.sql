CREATE TABLE "AdminUser" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "permissions" JSONB,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");
