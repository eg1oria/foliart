import { describe, expect, it } from 'vitest';

import { normalizeAdminUsername, validateAdminUsername } from './adminAccountRules';
import { generateAdminPassword, validateNewPassword } from './adminPasswordRules';

describe('admin login rules', () => {
  it('lowercases and trims a login', () => {
    expect(normalizeAdminUsername('  Editor.One  ')).toBe('editor.one');
  });

  it('accepts a latin and a cyrillic login', () => {
    expect(validateAdminUsername('editor-one')).toBeNull();
    expect(validateAdminUsername('Редактор.Один')).toBeNull();
  });

  it('refuses the shapes the backend refuses, mixed alphabets included', () => {
    for (const value of [
      'ab',
      'a'.repeat(33),
      'two words',
      'два слова',
      '-lead',
      'редактор-editor',
    ]) {
      expect(validateAdminUsername(value)).not.toBeNull();
    }
  });

  it('compares logins in the composed form', () => {
    // "й" typed as "и" + a combining breve is the same login as the composed one.
    expect(validateAdminUsername('андре\u0438\u0306', ['андрей'])).toBe(
      'Администратор с таким логином уже существует.',
    );
  });

  it('reports a login that is already taken', () => {
    expect(validateAdminUsername(' Editor ', ['editor'])).toBe(
      'Администратор с таким логином уже существует.',
    );
  });
});

describe('admin password rules', () => {
  it('accepts any password, short ones and the login itself included', () => {
    expect(validateNewPassword('1', '1')).toEqual({});
    expect(validateNewPassword('editor', 'editor')).toEqual({});
    expect(validateNewPassword(' ', ' ')).toEqual({});
  });

  it('refuses an empty password, a mismatch and an over-long one', () => {
    expect(validateNewPassword('', '')).toHaveProperty('newPassword');
    expect(validateNewPassword('a'.repeat(201), 'a'.repeat(201))).toHaveProperty(
      'newPassword',
    );
    expect(validateNewPassword('secret', 'other')).toHaveProperty('confirmPassword');
  });

  it('generates a password that passes its own rules', () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const password = generateAdminPassword();

      expect(password).toHaveLength(20);
      expect(validateNewPassword(password, password)).toEqual({});
    }
  });
});
