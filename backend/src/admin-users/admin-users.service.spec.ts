import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { hashAdminPassword } from './admin-password.util';
import { AdminUsersService } from './admin-users.service';

type AdminUserRow = {
  id: number;
  username: string;
  passwordHash: string;
  isSuperAdmin: boolean;
  permissions: unknown;
  tokenVersion: number;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function createRow(overrides: Partial<AdminUserRow> = {}): AdminUserRow {
  return {
    id: 1,
    username: 'editor',
    passwordHash: 'scrypt$16384$8$1$c2FsdA==$aGFzaA==',
    isSuperAdmin: false,
    permissions: { products: 'manage' },
    tokenVersion: 0,
    lastLoginAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function expectTokenVersionBump(update: jest.Mock) {
  const calls = update.mock.calls as Array<
    [{ data?: { tokenVersion?: unknown } }]
  >;

  expect(calls).toHaveLength(1);
  expect(calls[0][0].data?.tokenVersion).toEqual({ increment: 1 });
}

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let adminUser: {
    count: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };

  const originalEnv = { ...process.env };

  beforeEach(async () => {
    adminUser = {
      count: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUsersService,
        { provide: PrismaService, useValue: { adminUser } },
      ],
    }).compile();

    service = module.get(AdminUsersService);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  describe('bootstrapSuperAdmin', () => {
    it('creates the super admin from the environment when the table is empty', async () => {
      adminUser.count.mockResolvedValue(0);
      adminUser.create.mockImplementation(
        ({ data }: { data: Partial<AdminUserRow> }) =>
          Promise.resolve(createRow({ ...data, id: 1 })),
      );
      process.env.ADMIN_USERNAME = 'Root';
      process.env.ADMIN_PASSWORD = 'long-enough-password';

      const created = await service.bootstrapSuperAdmin();

      expect(created).toMatchObject({ username: 'root', isSuperAdmin: true });
      expect(created?.permissions).toEqual({
        products: 'manage',
        articles: 'manage',
        calendars: 'manage',
        partners: 'manage',
        contacts: 'manage',
        messages: 'manage',
      });
    });

    it('does nothing when an admin already exists', async () => {
      adminUser.count.mockResolvedValue(1);
      process.env.ADMIN_PASSWORD = 'long-enough-password';

      await expect(service.bootstrapSuperAdmin()).resolves.toBeNull();
      expect(adminUser.create).not.toHaveBeenCalled();
    });

    it('refuses to create a super admin with a weak environment password', async () => {
      adminUser.count.mockResolvedValue(0);
      process.env.ADMIN_USERNAME = 'root';
      process.env.ADMIN_PASSWORD = 'short';

      await expect(service.bootstrapSuperAdmin()).resolves.toBeNull();
      expect(adminUser.create).not.toHaveBeenCalled();
    });
  });

  describe('authenticate', () => {
    it('returns the admin without the password hash', async () => {
      const passwordHash = await hashAdminPassword('long-enough-password');
      const row = createRow({ passwordHash });
      adminUser.findUnique.mockResolvedValue(row);
      adminUser.update.mockResolvedValue({ ...row, lastLoginAt: new Date() });

      const result = await service.authenticate(
        'editor',
        'long-enough-password',
      );

      expect(result).toMatchObject({ id: 1, username: 'editor' });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('grants the super admin every section regardless of the stored document', async () => {
      const passwordHash = await hashAdminPassword('long-enough-password');
      const row = createRow({
        isSuperAdmin: true,
        passwordHash,
        permissions: { products: 'none' },
      });
      adminUser.findUnique.mockResolvedValue(row);
      adminUser.update.mockResolvedValue(row);

      const result = await service.authenticate(
        'editor',
        'long-enough-password',
      );

      expect(result.permissions.products).toBe('manage');
    });

    it('rejects a wrong password and an unknown login the same way', async () => {
      const passwordHash = await hashAdminPassword('long-enough-password');
      adminUser.findUnique.mockResolvedValueOnce(createRow({ passwordHash }));

      await expect(
        service.authenticate('editor', 'wrong-password'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      adminUser.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.authenticate('ghost', 'wrong-password'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('locks a login out after repeated failures', async () => {
      adminUser.findUnique.mockResolvedValue(null);

      for (let attempt = 0; attempt < 10; attempt += 1) {
        await expect(
          service.authenticate('editor', 'wrong-password'),
        ).rejects.toBeInstanceOf(UnauthorizedException);
      }

      adminUser.findUnique.mockClear();

      await expect(
        service.authenticate('editor', 'wrong-password'),
      ).rejects.toThrow('Too many failed attempts. Try again later.');
      expect(adminUser.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('mutations', () => {
    it('bumps the token version when permissions change', async () => {
      const row = createRow();
      adminUser.findUnique.mockResolvedValue(row);
      adminUser.update.mockResolvedValue({ ...row, tokenVersion: 1 });

      await service.updatePermissions(1, {
        products: 'view',
        articles: 'none',
        calendars: 'none',
        partners: 'none',
        contacts: 'none',
        messages: 'none',
      });

      expectTokenVersionBump(adminUser.update);
    });

    it('bumps the token version when the password changes', async () => {
      const row = createRow();
      adminUser.findUnique.mockResolvedValue(row);
      adminUser.update.mockResolvedValue({ ...row, tokenVersion: 1 });

      await service.setPassword(1, 'another-long-password');

      expectTokenVersionBump(adminUser.update);
    });

    it('requires the current password to change your own', async () => {
      const passwordHash = await hashAdminPassword('long-enough-password');
      adminUser.findUnique.mockResolvedValue(createRow({ passwordHash }));

      await expect(
        service.changeOwnPassword(1, 'wrong-password', 'another-long-password'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(adminUser.update).not.toHaveBeenCalled();
    });

    it('never restricts or deletes the super admin', async () => {
      adminUser.findUnique.mockResolvedValue(createRow({ isSuperAdmin: true }));

      await expect(
        service.updatePermissions(1, {
          products: 'none',
          articles: 'none',
          calendars: 'none',
          partners: 'none',
          contacts: 'none',
          messages: 'none',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(service.remove(1)).rejects.toBeInstanceOf(ConflictException);
      expect(adminUser.delete).not.toHaveBeenCalled();
    });

    it('reports a duplicate login as a conflict', async () => {
      adminUser.create.mockRejectedValue(
        Object.assign(new Error('unique'), { code: 'P2002' }),
      );

      await expect(
        service.create({
          username: 'editor',
          password: 'long-enough-password',
          permissions: {
            products: 'manage',
            articles: 'none',
            calendars: 'none',
            partners: 'none',
            contacts: 'none',
            messages: 'none',
          },
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
