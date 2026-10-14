import type { SitePageDisplayMode } from './sitePages';

/**
 * Pasted pages are whole landings with their own scripts, so their markup never
 * enters the site's DOM. It is served by `/page-frame/*` under a CSP `sandbox`
 * without `allow-same-origin`: the document runs in an opaque origin, cannot
 * read the site's cookies or storage and cannot call the API as a signed-in
 * admin — even when someone opens the frame URL directly. The iframe that
 * shows it carries the same tokens.
 *
 * `preview` is the admin's editor preview: links open in a new tab instead of
 * navigating the admin panel away.
 */
export type SitePageFrameMode = SitePageDisplayMode | 'preview';

const sharedSandboxTokens = [
  'allow-scripts',
  'allow-forms',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-modals',
];

export function getSitePageSandbox(mode: SitePageFrameMode) {
  return (
    mode === 'preview'
      ? sharedSandboxTokens
      : [...sharedSandboxTokens, 'allow-top-navigation-by-user-activation']
  ).join(' ');
}

/** Messages the helper script posts to the page that frames it. */
export const sitePageFrameMessageSource = 'foliart-site-page';

export type SitePageFrameMessage =
  | { source: typeof sitePageFrameMessageSource; type: 'height'; height: number }
  | { source: typeof sitePageFrameMessageSource; type: 'scroll'; top: number };

export function parseSitePageFrameMessage(data: unknown): SitePageFrameMessage | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const message = data as Record<string, unknown>;

  if (message.source !== sitePageFrameMessageSource) {
    return null;
  }

  if (message.type === 'height' && typeof message.height === 'number' && Number.isFinite(message.height)) {
    return { source: sitePageFrameMessageSource, type: 'height', height: message.height };
  }

  if (message.type === 'scroll' && typeof message.top === 'number' && Number.isFinite(message.top)) {
    return { source: sitePageFrameMessageSource, type: 'scroll', top: message.top };
  }

  return null;
}

export function getSitePageFrameHeaders(mode: SitePageFrameMode) {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    // No `default-src`: a landing may pull fonts, styles and scripts from any
    // CDN. The sandbox is what keeps those scripts away from the site.
    'Content-Security-Policy': `sandbox ${getSitePageSandbox(mode)}; frame-ancestors 'self'`,
    // Google files the markup under the page that frames it rather than under
    // this technical URL.
    'X-Robots-Tag': 'noindex, indexifembedded',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Runs inside the sandboxed document. Embedded pages report their height so
 * the iframe can grow with them, and hand in-page `#anchor` jumps to the parent,
 * which is the one that scrolls. Ordinary links get `target="_top"` so they
 * leave the frame instead of loading the site inside it (in the preview they
 * open a new tab). A link the page handles itself — `preventDefault()` in its
 * own listener — is left alone.
 */
function buildHelperScript(mode: SitePageFrameMode) {
  return `<script data-foliart-site-page>(function(){
var mode=${JSON.stringify(mode)};
var source=${JSON.stringify(sitePageFrameMessageSource)};
function post(message){message.source=source;try{window.parent.postMessage(message,'*');}catch(e){}}
document.addEventListener('click',function(event){
if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
var link=event.target&&event.target.closest?event.target.closest('a[href]'):null;
if(!link)return;
var target=link.getAttribute('target');
if(target&&target!=='_self')return;
var href=link.getAttribute('href')||'';
if(/^(javascript|mailto|tel):/i.test(href))return;
if(href.charAt(0)==='#'){
if(mode!=='embedded')return;
event.preventDefault();
var id=href.slice(1);try{id=decodeURIComponent(id);}catch(e){}
var element=id?(document.getElementById(id)||document.getElementsByName(id)[0]):document.body;
if(element)post({type:'scroll',top:element.getBoundingClientRect().top+window.scrollY});
return;
}
link.setAttribute('target',mode==='preview'?'_blank':'_top');
if(mode==='preview')link.setAttribute('rel','noopener');
});
if(mode!=='embedded')return;
var last=-1;
function measure(){
var root=document.documentElement;var body=document.body;
var height=root.getBoundingClientRect().height;
if(body){var style=window.getComputedStyle(body);height=Math.max(height,body.getBoundingClientRect().bottom+window.scrollY+(parseFloat(style.marginBottom)||0));}
height=Math.ceil(height);
if(height!==last){last=height;post({type:'height',height:height});}
}
if(typeof ResizeObserver==='function'){var observer=new ResizeObserver(measure);observer.observe(document.documentElement);if(document.body)observer.observe(document.body);}
window.addEventListener('load',measure);
setInterval(measure,1000);
measure();
})();</script>`;
}

const documentShellPattern = /<!doctype|<html[\s>]|<head[\s>]|<body[\s>]/i;

/**
 * Turns the HTML an admin pasted into the document the frame serves. A bare
 * fragment gets a minimal shell around it, without the default body margin; a
 * whole document is kept as typed,
 * with a viewport tag added when it has none. The helper script goes last in
 * the body, after the page's own scripts.
 */
export function buildSitePageDocument(
  html: string,
  { lang, mode, title }: { lang: string; mode: SitePageFrameMode; title: string },
) {
  const helper = buildHelperScript(mode);

  if (!documentShellPattern.test(html)) {
    return [
      '<!doctype html>',
      `<html lang="${escapeHtml(lang)}">`,
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      `<title>${escapeHtml(title)}</title>`,
      // A fragment is meant to sit edge to edge under the band, not inside the
      // browser's default 8px body margin.
      '<style>html,body{margin:0}</style>',
      '</head>',
      '<body>',
      html,
      helper,
      '</body>',
      '</html>',
    ].join('\n');
  }

  let document = html;

  if (!/<meta[^>]+name\s*=\s*["']?viewport/i.test(document)) {
    document = document.replace(
      /<head(\s[^>]*)?>/i,
      (match) => `${match}\n<meta name="viewport" content="width=device-width, initial-scale=1">`,
    );
  }

  const bodyClose = document.search(/<\/body\s*>(?![\s\S]*<\/body\s*>)/i);

  if (bodyClose !== -1) {
    return `${document.slice(0, bodyClose)}${helper}\n${document.slice(bodyClose)}`;
  }

  const htmlClose = document.search(/<\/html\s*>(?![\s\S]*<\/html\s*>)/i);

  if (htmlClose !== -1) {
    return `${document.slice(0, htmlClose)}${helper}\n${document.slice(htmlClose)}`;
  }

  return `${document}\n${helper}`;
}
