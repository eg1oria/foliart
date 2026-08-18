// `/lang` (translation diff) and `/habits` (personal tracker) are internal
// tools, not part of the public site. `noindex` only asks crawlers to stay
// away — it does not stop anyone who knows the URL — so the routes 404 unless
// this flag is on. Development keeps them on; production has to opt in via
// ENABLE_INTERNAL_TOOLS=true.
export const internalToolsEnabled =
  process.env.NODE_ENV !== 'production' || process.env.ENABLE_INTERNAL_TOOLS === 'true';
