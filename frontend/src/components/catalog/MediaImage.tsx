'use client';

import Image, { type ImageProps } from 'next/image';
import { type ReactNode, useState } from 'react';

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
  const [failedSource, setFailedSource] = useState<{
    key: string;
    stage: 'primary' | 'fallback';
  } | null>(null);
  const sourceKey = `${src ?? ''}|${fallbackSrc ?? ''}`;
  const failureStage = failedSource?.key === sourceKey ? failedSource.stage : null;
  const currentSrc =
    failureStage === 'primary' ? fallbackSrc ?? null : src ?? fallbackSrc ?? null;
  const showPlaceholder = !currentSrc || failureStage === 'fallback';

  if (!currentSrc || showPlaceholder) {
    return <>{emptyState}</>;
  }

  return (
    <Image
      {...props}
      src={currentSrc}
      alt={alt}
      onError={() => {
        if (src && fallbackSrc && failureStage !== 'primary') {
          setFailedSource({ key: sourceKey, stage: 'primary' });
          return;
        }

        setFailedSource({ key: sourceKey, stage: 'fallback' });
      }}
    />
  );
}
