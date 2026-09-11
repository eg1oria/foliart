import { BadRequestException } from '@nestjs/common';

// Keys come from the frontend slot registry (`frontend/src/lib/siteImages.ts`)
// and end up in a file name on disk, so the mask is deliberately narrower than
// anything a path could smuggle through.
const siteImageKeyPattern = /^[a-z0-9-]{1,64}$/;

export function parseSiteImageKey(value: string): string {
  if (!siteImageKeyPattern.test(value)) {
    throw new BadRequestException('Unsupported site image key');
  }

  return value;
}
