import { BadRequestException } from '@nestjs/common';
import {
  parseAdminPassword,
  parseAdminPermissions,
  parseAdminUserId,
  parseAdminUsername,
  parseChangePasswordBody,
  parseCreateAdminUserBody,
} from './admin-users.validation';

describe('admin users validation', () => {
  it('lowercases and trims a login', () => {
    expect(parseAdminUsername('  Editor.One  ')).toBe('editor.one');
  });

  it('rejects logins that are too short, too long or contain spaces', () => {
    for (const value of ['ab', 'a'.repeat(33), 'two words', 'ходжа', '-lead']) {
      expect(() => parseAdminUsername(value)).toThrow(BadRequestException);
    }
  });

  it('enforces the password length bounds', () => {
    expect(parseAdminPassword('0123456789')).toBe('0123456789');
    expect(() => parseAdminPassword('123456789')).toThrow(BadRequestException);
    expect(() => parseAdminPassword('a'.repeat(201))).toThrow(
      BadRequestException,
    );
  });

  it('normalizes permissions and drops unknown keys', () => {
    expect(
      parseAdminPermissions({
        products: 'manage',
        articles: 'view',
        secrets: 'manage',
        calendars: 'nonsense',
      }),
    ).toEqual({
      products: 'manage',
      articles: 'view',
      calendars: 'none',
      messages: 'none',
    });
  });

  it('requires permissions to be an object', () => {
    for (const value of [undefined, null, 'manage', ['manage']]) {
      expect(() => parseAdminPermissions(value)).toThrow(BadRequestException);
    }
  });

  it('parses a create payload', () => {
    expect(
      parseCreateAdminUserBody({
        username: 'Editor',
        password: 'long-enough-password',
        permissions: { products: 'manage' },
      }),
    ).toEqual({
      username: 'editor',
      password: 'long-enough-password',
      permissions: {
        products: 'manage',
        articles: 'none',
        calendars: 'none',
        messages: 'none',
      },
    });
  });

  it('requires the current password when changing it', () => {
    expect(() =>
      parseChangePasswordBody({ newPassword: 'long-enough-password' }),
    ).toThrow(BadRequestException);
  });

  it('accepts only positive integer ids', () => {
    expect(parseAdminUserId('7')).toBe(7);
    for (const value of ['0', '-1', 'abc', '1.5']) {
      expect(() => parseAdminUserId(value)).toThrow(BadRequestException);
    }
  });
});
