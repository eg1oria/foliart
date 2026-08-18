import {
  burnAdminPasswordTiming,
  hashAdminPassword,
  verifyAdminPassword,
} from './admin-password.util';

describe('admin password hashing', () => {
  it('verifies a password against its own hash', async () => {
    const hash = await hashAdminPassword('correct horse battery');

    await expect(
      verifyAdminPassword('correct horse battery', hash),
    ).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashAdminPassword('correct horse battery');

    await expect(
      verifyAdminPassword('correct horse batter', hash),
    ).resolves.toBe(false);
  });

  it('never reuses a salt', async () => {
    const first = await hashAdminPassword('correct horse battery');
    const second = await hashAdminPassword('correct horse battery');

    expect(first).not.toEqual(second);
  });

  it('keeps the cost parameters inside the hash', async () => {
    const hash = await hashAdminPassword('correct horse battery');

    expect(hash.startsWith('scrypt$16384$8$1$')).toBe(true);
    expect(hash.split('$')).toHaveLength(6);
  });

  it('rejects malformed stored hashes instead of throwing', async () => {
    for (const stored of [
      '',
      'plain-text-password',
      'bcrypt$16384$8$1$c2FsdA==$aGFzaA==',
      'scrypt$0$8$1$c2FsdA==$aGFzaA==',
      'scrypt$16384$8$1$c2FsdA==',
    ]) {
      await expect(
        verifyAdminPassword('correct horse battery', stored),
      ).resolves.toBe(false);
    }
  });

  it('spends time on an unknown login too', async () => {
    await expect(burnAdminPasswordTiming('anything')).resolves.toBeUndefined();
  });
});
