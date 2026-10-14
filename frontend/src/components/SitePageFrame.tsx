'use client';

import { useEffect, useRef, useState } from 'react';

import { getSitePageSandbox, parseSitePageFrameMessage } from '@/lib/sitePageFrame';
import type { SitePageDisplayMode } from '@/lib/sitePages';

// A runaway page (say, a `100vh` block that grows with the frame) must not
// stretch the document forever.
const maxFrameHeight = 60_000;

/**
 * Shows a page built in the admin. Its markup comes from the sandboxed
 * `/page-frame/*` route and never touches this document; the frame only talks
 * back through `postMessage`, and only messages from this very frame count.
 */
export default function SitePageFrame({
  displayMode,
  src,
  title,
}: {
  displayMode: SitePageDisplayMode;
  src: string;
  title: string;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const isFullscreen = displayMode === 'fullscreen';

  useEffect(() => {
    if (isFullscreen) {
      return;
    }

    function onMessage(event: MessageEvent) {
      const frame = frameRef.current;

      if (!frame || event.source !== frame.contentWindow) {
        return;
      }

      const message = parseSitePageFrameMessage(event.data);

      if (message?.type === 'height') {
        setHeight(Math.min(Math.max(Math.ceil(message.height), 0), maxFrameHeight));
      } else if (message?.type === 'scroll') {
        const top = frame.getBoundingClientRect().top + window.scrollY + message.top;
        // Leaves room for the sticky site header that appears on scroll.
        window.scrollTo({ top: Math.max(top - 80, 0), behavior: 'smooth' });
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [isFullscreen]);

  // The landing scrolls inside its own frame; the site underneath must not.
  useEffect(() => {
    if (!isFullscreen) {
      return;
    }

    const { overflow } = document.documentElement.style;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = overflow;
    };
  }, [isFullscreen]);

  return (
    <iframe
      ref={frameRef}
      src={src}
      title={title}
      sandbox={getSitePageSandbox(displayMode)}
      referrerPolicy="strict-origin-when-cross-origin"
      className={
        isFullscreen
          ? 'fixed inset-0 z-[1000] block h-dvh w-full border-0 bg-white'
          : 'block w-full border-0 bg-white'
      }
      style={isFullscreen ? undefined : { height: height ?? '80vh' }}
    />
  );
}
