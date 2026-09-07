'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    ym?: (counterId: number, event: string, ...args: unknown[]) => void;
  }
}

export default function YandexMetrika({ counterId }: { counterId: number }) {
  const pathname = usePathname();
  const previousUrlRef = useRef<string | null>(null);

  // The counter reports the entry page itself while initialising. Every later
  // page is a client-side App Router navigation with no document load behind
  // it, so without this hit Metrika would only ever see the page a visitor
  // landed on.
  useEffect(() => {
    const url = window.location.href;
    const previousUrl = previousUrlRef.current;
    previousUrlRef.current = url;

    if (previousUrl === null || previousUrl === url) {
      return;
    }

    window.ym?.(counterId, 'hit', url, { referer: previousUrl });
  }, [counterId, pathname]);

  return (
    <>
      {/* Loader snippet as published by Metrika: it queues `ym(...)` calls
          behind a stub until tag.js arrives and refuses to inject a second
          copy of the tag. */}
      <Script id="yandex-metrika" strategy="afterInteractive">
        {`(function(m,e,t,r,i,k,a){
m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();
for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
})(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=${counterId}', 'ym');

ym(${counterId}, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});`}
      </Script>
      <noscript>
        <div>
          {/* A tracking pixel, not content: next/image would route it through
              the optimizer and break the beacon. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://mc.yandex.ru/watch/${counterId}`}
            style={{ position: 'absolute', left: '-9999px' }}
            alt=""
          />
        </div>
      </noscript>
    </>
  );
}
