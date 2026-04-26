import Image, { type ImageProps } from 'next/image';
import { type ReactNode } from 'react';

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
  const currentSrc = src ?? fallbackSrc ?? null;

  if (!currentSrc) {
    return <>{emptyState}</>;
  }

  return <Image {...props} src={currentSrc} alt={alt} />;
}
