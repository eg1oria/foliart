import { BadRequestException } from '@nestjs/common';
import {
  normalizeAdminPermissions,
  type AdminPermissions,
} from '../admin-sections';

export const ADMIN_USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])$/;
export const ADMIN_PASSWORD_MIN_LENGTH = 10;
export const ADMIN_PASSWORD_MAX_LENGTH = 200;

function fail(message: string): never {
  throw new BadRequestException(message);
}

function assertPlainObject(
  value: unknown,
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('Request body must be an object');
  }
}

export function parseAdminUsername(value: unknown) {
  if (typeof value !== 'string') {
    fail('Username is required');
  }

  const username = value.trim().toLowerCase();

  if (!ADMIN_USERNAME_PATTERN.test(username)) {
    fail(
      'Username must be 3-32 characters long and may contain latin letters, digits, dot, dash and underscore',
    );
  }

  return username;
}

export function parseAdminPassword(value: unknown) {
  if (typeof value !== 'string') {
    fail('Password is required');
  }

  if (
    value.length < ADMIN_PASSWORD_MIN_LENGTH ||
    value.length > ADMIN_PASSWORD_MAX_LENGTH
  ) {
    fail(
      `Password must be between ${ADMIN_PASSWORD_MIN_LENGTH} and ${ADMIN_PASSWORD_MAX_LENGTH} characters long`,
    );
  }

  return value;
}

export function parseAdminPermissions(value: unknown): AdminPermissions {
  if (value === undefined || value === null) {
    fail('Permissions are required');
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    fail('Permissions must be an object');
  }

  return normalizeAdminPermissions(value);
}

export function parseAdminUserId(value: unknown) {
  const id = typeof value === 'string' ? Number(value) : value;

  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) {
    fail('Admin id must be a positive integer');
  }

  return id;
}

export function parseAuthenticateBody(body: unknown) {
  assertPlainObject(body);

  if (typeof body.username !== 'string' || typeof body.password !== 'string') {
    fail('Username and password are required');
  }

  return {
    username: body.username.trim().toLowerCase(),
    password: body.password,
  };
}

export function parseCreateAdminUserBody(body: unknown) {
  assertPlainObject(body);

  return {
    username: parseAdminUsername(body.username),
    password: parseAdminPassword(body.password),
    permissions: parseAdminPermissions(body.permissions),
  };
}

export function parseUpdateAdminUserBody(body: unknown) {
  assertPlainObject(body);

  return { permissions: parseAdminPermissions(body.permissions) };
}

export function parseSetPasswordBody(body: unknown) {
  assertPlainObject(body);

  return { password: parseAdminPassword(body.password) };
}

export function parseChangePasswordBody(body: unknown) {
  assertPlainObject(body);

  if (typeof body.currentPassword !== 'string') {
    fail('Current password is required');
  }

  return {
    currentPassword: body.currentPassword,
    newPassword: parseAdminPassword(body.newPassword),
  };
}
