'use client';

import Image, { type ImageProps } from 'next/image';
import { type ReactNode, useEffect, useState } from 'react';

type MediaImageProps = Omit<ImageProps, 'src'> & {
  src?: string | null;
  fallbackSrc?: string | null;
  emptyState?: ReactNode;
};

export default function MediaImage({
  src,
  fallbackSrc,
  emptyState = null,
  alt,
  ...props
}: MediaImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string | null>(
    src ?? fallbackSrc ?? null,
  );
  const [showPlaceholder, setShowPlaceholder] = useState(!src && !fallbackSrc);

  useEffect(() => {
    const nextSource = src ?? fallbackSrc ?? null;
    setCurrentSrc(nextSource);
    setShowPlaceholder(!nextSource);
  }, [fallbackSrc, src]);

  if (!currentSrc || showPlaceholder) {
    return <>{emptyState}</>;
  }

  return (
    <Image
      {...props}
      src={currentSrc}
      alt={alt}
      onError={() => {
        if (fallbackSrc && currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
          return;
        }

        setShowPlaceholder(true);
      }}
    />
  );
}
