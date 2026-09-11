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

  it('accepts a cyrillic login', () => {
    expect(parseAdminUsername('  Редактор.Один  ')).toBe('редактор.один');
  });

  it('rejects logins that are too short, too long, spaced or mixed alphabets', () => {
    for (const value of [
      'ab',
      'a'.repeat(33),
      'two words',
      'два слова',
      '-lead',
      'редактор-editor',
    ]) {
      expect(() => parseAdminUsername(value)).toThrow(BadRequestException);
    }
  });

  it('accepts any password that is not empty', () => {
    expect(parseAdminPassword('123')).toBe('123');
    expect(parseAdminPassword(' ')).toBe(' ');
    expect(() => parseAdminPassword('')).toThrow(BadRequestException);
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
      partners: 'none',
      certificates: 'none',
      contacts: 'none',
      'site-images': 'none',
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
        partners: 'none',
        certificates: 'none',
        contacts: 'none',
        'site-images': 'none',
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
