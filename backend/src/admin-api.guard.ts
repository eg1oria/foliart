import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';

const DEFAULT_ADMIN_API_SECRET = 'foliart-admin-api-secret-2026';

function getExpectedSecret() {
  return (
    process.env.ADMIN_API_SECRET ??
    process.env.ADMIN_PASSWORD ??
    DEFAULT_ADMIN_API_SECRET
  );
}

function getHeaderValue(request: Request, name: string) {
  const value = request.headers[name.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

@Injectable()
export class AdminApiGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const providedSecret = getHeaderValue(request, 'x-admin-secret');

    if (
      typeof providedSecret === 'string' &&
      safeEqual(providedSecret, getExpectedSecret())
    ) {
      return true;
    }

    throw new UnauthorizedException('Admin authorization required');
  }
}
