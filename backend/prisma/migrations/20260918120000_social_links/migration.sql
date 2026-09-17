-- Social network badges in the header, one row per badge per content locale.
CREATE TABLE "SocialLink" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "locale" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '',
    "text" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "SocialLink_locale_sortOrder_idx" ON "SocialLink"("locale", "sortOrder");

-- The badges the header rendered from hardcoded lists before this section
-- existed, so the public site looks unchanged until an admin edits them.
INSERT INTO "SocialLink" ("locale", "label", "href", "icon", "text", "sortOrder", "updatedAt")
VALUES
    ('ru', 'Dzen', 'https://dzen.ru/foliart', '', 'DZ', 0, CURRENT_TIMESTAMP),
    ('ru', 'VK', 'https://vk.com/foliart', 'vk', '', 1, CURRENT_TIMESTAMP),
    ('ru', 'OK', 'https://ok.ru/group/70000047721968', 'ok', '', 2, CURRENT_TIMESTAMP),
    ('ru', 'MAX', 'https://max.ru/id2309181772_biz', '', 'MAX', 3, CURRENT_TIMESTAMP),
    ('en', 'Facebook', 'https://www.facebook.com/groups/foliart.england/', 'facebook', '', 0, CURRENT_TIMESTAMP),
    ('fr', 'Facebook', 'https://www.facebook.com/groups/foliart.france/', 'facebook', '', 0, CURRENT_TIMESTAMP),
    ('es', 'Facebook', 'https://www.facebook.com/groups/foliart.espania', 'facebook', '', 0, CURRENT_TIMESTAMP);
