-- The site-wide certificate is gone: a product card links the documents
-- attached to that product, and a product with none falls back to the scan
-- bundled in the frontend's `public/`. Files that were uploaded through the
-- removed admin section are left on disk under `images/certificates/`.
DROP TABLE IF EXISTS "Certificate";
