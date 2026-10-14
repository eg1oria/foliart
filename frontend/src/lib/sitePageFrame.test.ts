import { describe, expect, it } from 'vitest';

import {
  buildSitePageDocument,
  getSitePageFrameHeaders,
  getSitePageSandbox,
  parseSitePageFrameMessage,
  sitePageFrameMessageSource,
} from './sitePageFrame';

describe('site page frame', () => {
  it('wraps a fragment in a minimal document', () => {
    const document = buildSitePageDocument('<section>Hi</section>', {
      lang: 'fr',
      mode: 'embedded',
      title: 'A <b> & "c"',
    });

    expect(document.startsWith('<!doctype html>')).toBe(true);
    expect(document).toContain('<html lang="fr">');
    expect(document).toContain('<title>A &lt;b&gt; &amp; &quot;c&quot;</title>');
    expect(document).toContain('name="viewport"');
    expect(document.indexOf('<section>Hi</section>')).toBeLessThan(
      document.indexOf('data-foliart-site-page'),
    );
  });

  it('keeps a whole document and puts the helper before the last </body>', () => {
    const html =
      '<!DOCTYPE html><html><head><meta name="viewport" content="width=1200"></head>' +
      '<body><script>var s = "</body>";</script><p>x</p></BODY></html>';
    const document = buildSitePageDocument(html, { lang: 'ru', mode: 'fullscreen', title: '' });

    expect(document.startsWith('<!DOCTYPE html><html><head><meta name="viewport" content="width=1200">')).toBe(true);
    expect(document.match(/name="viewport"/g)).toHaveLength(1);
    expect(document.indexOf('data-foliart-site-page')).toBeGreaterThan(document.indexOf('<p>x</p>'));
    expect(document.endsWith('</BODY></html>')).toBe(true);
  });

  it('adds a viewport tag to a document without one', () => {
    const document = buildSitePageDocument('<html><head lang="x"><title>t</title></head><body></body></html>', {
      lang: 'ru',
      mode: 'embedded',
      title: '',
    });

    expect(document).toContain('<head lang="x">\n<meta name="viewport"');
  });

  it('tells the helper which mode it runs in', () => {
    expect(buildSitePageDocument('<p></p>', { lang: 'ru', mode: 'preview', title: '' })).toContain(
      'var mode="preview"',
    );
  });

  it('never grants the frame its own origin', () => {
    for (const mode of ['embedded', 'fullscreen', 'preview'] as const) {
      expect(getSitePageSandbox(mode)).not.toContain('allow-same-origin');
      expect(getSitePageFrameHeaders(mode)['Content-Security-Policy']).toMatch(/^sandbox allow-scripts/);
    }

    expect(getSitePageSandbox('preview')).not.toContain('allow-top-navigation');
    expect(getSitePageSandbox('embedded')).toContain('allow-top-navigation-by-user-activation');
  });

  it('only accepts well-formed messages from the helper', () => {
    expect(
      parseSitePageFrameMessage({ source: sitePageFrameMessageSource, type: 'height', height: 640 }),
    ).toEqual({ source: sitePageFrameMessageSource, type: 'height', height: 640 });
    expect(parseSitePageFrameMessage({ source: 'other', type: 'height', height: 640 })).toBeNull();
    expect(
      parseSitePageFrameMessage({ source: sitePageFrameMessageSource, type: 'height', height: 'x' }),
    ).toBeNull();
    expect(
      parseSitePageFrameMessage({ source: sitePageFrameMessageSource, type: 'scroll', top: Infinity }),
    ).toBeNull();
    expect(parseSitePageFrameMessage('height')).toBeNull();
  });
});
