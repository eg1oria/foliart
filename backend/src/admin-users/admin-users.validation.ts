import { BadRequestException } from '@nestjs/common';
import {
  normalizeAdminPermissions,
  type AdminPermissions,
} from '../admin-sections';

// A login is latin or cyrillic, never both: `admin` and `аdmin` with a cyrillic
// `а` look identical and would otherwise be two different accounts.
const LATIN_USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])$/;
const CYRILLIC_USERNAME_PATTERN = /^[а-яё0-9](?:[а-яё0-9._-]{1,30}[а-яё0-9])$/;

export const ADMIN_PASSWORD_MAX_LENGTH = 200;

// Cyrillic letters have more than one encoding, so the composed form is the one
// that reaches the unique index and the login form alike.
export function normalizeAdminUsername(value: string) {
  return value.normalize('NFC').trim().toLowerCase();
}

export function isAdminUsername(value: string) {
  return (
    LATIN_USERNAME_PATTERN.test(value) || CYRILLIC_USERNAME_PATTERN.test(value)
  );
}

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

  const username = normalizeAdminUsername(value);

  if (!isAdminUsername(username)) {
    fail(
      'Username must be 3-32 characters long and may contain latin or cyrillic letters (not both), digits, dot, dash and underscore',
    );
  }

  return username;
}

// Any password the super admin picks is accepted; only an empty one and a
// length that would make hashing pointlessly expensive are refused.
export function parseAdminPassword(value: unknown) {
  if (typeof value !== 'string') {
    fail('Password is required');
  }

  if (!value) {
    fail('Password must not be empty');
  }

  if (value.length > ADMIN_PASSWORD_MAX_LENGTH) {
    fail(
      `Password must be at most ${ADMIN_PASSWORD_MAX_LENGTH} characters long`,
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
    username: normalizeAdminUsername(body.username),
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
