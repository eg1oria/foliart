'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import MediaImage from '@/components/catalog/MediaImage';

type ProductImageLightboxProps = {
  src?: string | null;
  productName: string;
  alt: string;
  sizes: string;
  emptyState: ReactNode;
  locale: string;
};

export default function ProductImageLightbox({
  src,
  productName,
  alt,
  sizes,
  emptyState,
  locale,
}: ProductImageLightboxProps) {
  const [open, setOpen] = useState(false);
  const slides = useMemo(
    () => (src ? [{ src, alt, imageFit: 'contain' as const }] : []),
    [alt, src],
  );
  const openLabel =
    locale === 'en' ? `View ${productName} image` : `Посмотреть фото ${productName}`;
  const closeLabel = locale === 'en' ? 'Close' : 'Закрыть';

  if (!src) {
    return (
      <MediaImage
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className="object-contain drop-shadow-[0_28px_34px_rgba(0,0,0,0.12)]"
        emptyState={emptyState}
      />
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label={openLabel}
        onClick={() => setOpen(true)}
        className="group relative block h-full w-full cursor-zoom-in appearance-none border-0 bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b5a45] focus-visible:ring-offset-4">
        <MediaImage
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          className="object-contain drop-shadow-[0_28px_34px_rgba(0,0,0,0.12)] transition duration-300 group-hover:scale-[1.015]"
        />
      </button>

      <Lightbox
        open={open}
        close={() => setOpen(false)}
        slides={slides}
        plugins={[Zoom]}
        carousel={{ finite: true }}
        controller={{ closeOnBackdropClick: true }}
        labels={{ Close: closeLabel, Lightbox: productName }}
        toolbar={{ buttons: ['close'] }}
        zoom={{ maxZoomPixelRatio: 2.5, scrollToZoom: true }}
        styles={{
          container: { backgroundColor: 'rgba(0, 0, 0, 0.88)' },
          slide: {
            padding: 'clamp(24px, 4vw, 56px) clamp(16px, 4vw, 56px) 96px',
          },
        }}
        render={{
          buttonPrev: () => null,
          buttonNext: () => null,
          slideFooter: () => (
            <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center px-6">
              <div className="max-w-[min(88vw,720px)] text-center text-xl font-bold uppercase leading-tight text-white drop-shadow-[0_8px_22px_rgba(0,0,0,0.85)] md:text-2xl">
                {productName}
              </div>
            </div>
          ),
        }}
      />
    </>
  );
}
