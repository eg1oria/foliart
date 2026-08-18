import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import type { AdminUser, Prisma } from '@prisma/client';
import {
  createAdminPermissions,
  normalizeAdminPermissions,
  type AdminPermissions,
} from '../admin-sections';
import { PrismaService } from '../prisma/prisma.service';
import {
  burnAdminPasswordTiming,
  hashAdminPassword,
  verifyAdminPassword,
} from './admin-password.util';
import {
  ADMIN_USERNAME_PATTERN,
  ADMIN_PASSWORD_MIN_LENGTH,
} from './admin-users.validation';

const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_MS = 15 * 60 * 1000;

export type PublicAdminUser = {
  id: number;
  username: string;
  isSuperAdmin: boolean;
  permissions: AdminPermissions;
  tokenVersion: number;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type FailedAttempts = {
  count: number;
  lockedUntil: number;
};

@Injectable()
export class AdminUsersService implements OnModuleInit {
  private readonly logger = new Logger(AdminUsersService.name);
  private readonly failedAttempts = new Map<string, FailedAttempts>();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.bootstrapSuperAdmin();
  }

  // The very first super admin comes from the environment the deployment was
  // already configured with. Once any admin exists the database is the only
  // source of truth and ADMIN_PASSWORD is never read again.
  async bootstrapSuperAdmin() {
    const existing = await this.prisma.adminUser.count();

    if (existing > 0) {
      return null;
    }

    const username = (
      process.env.ADMIN_USERNAME ??
      process.env.ADMIN_LOGIN ??
      'admin'
    )
      .trim()
      .toLowerCase();
    const password = process.env.ADMIN_PASSWORD ?? '';

    if (!ADMIN_USERNAME_PATTERN.test(username)) {
      this.logger.error(
        'ADMIN_USERNAME is not a valid admin login, the super admin was not created',
      );
      return null;
    }

    if (password.length < ADMIN_PASSWORD_MIN_LENGTH) {
      this.logger.error(
        `ADMIN_PASSWORD must be at least ${ADMIN_PASSWORD_MIN_LENGTH} characters long, the super admin was not created`,
      );
      return null;
    }

    const created = await this.prisma.adminUser.create({
      data: {
        username,
        passwordHash: await hashAdminPassword(password),
        isSuperAdmin: true,
        permissions: createAdminPermissions('manage'),
      },
    });

    this.logger.log(`Created the super admin account "${username}"`);

    return this.toPublicAdminUser(created);
  }

  async authenticate(username: string, password: string) {
    if (this.isLockedOut(username)) {
      throw new UnauthorizedException(
        'Too many failed attempts. Try again later.',
      );
    }

    const record = await this.prisma.adminUser.findUnique({
      where: { username },
    });

    if (!record) {
      await burnAdminPasswordTiming(password);
      this.registerFailure(username);
      throw new UnauthorizedException('Invalid login or password');
    }

    if (!(await verifyAdminPassword(password, record.passwordHash))) {
      this.registerFailure(username);
      throw new UnauthorizedException('Invalid login or password');
    }

    this.failedAttempts.delete(username);

    const updated = await this.prisma.adminUser.update({
      where: { id: record.id },
      data: { lastLoginAt: new Date() },
    });

    return this.toPublicAdminUser(updated);
  }

  async list() {
    const records = await this.prisma.adminUser.findMany({
      orderBy: [{ isSuperAdmin: 'desc' }, { username: 'asc' }],
    });

    return records.map((record) => this.toPublicAdminUser(record));
  }

  async findById(id: number) {
    const record = await this.prisma.adminUser.findUnique({ where: { id } });

    if (!record) {
      throw new NotFoundException('Admin not found');
    }

    return this.toPublicAdminUser(record);
  }

  async create(input: {
    username: string;
    password: string;
    permissions: AdminPermissions;
  }) {
    const passwordHash = await hashAdminPassword(input.password);

    try {
      const created = await this.prisma.adminUser.create({
        data: {
          username: input.username,
          passwordHash,
          isSuperAdmin: false,
          permissions: input.permissions,
        },
      });

      return this.toPublicAdminUser(created);
    } catch (error) {
      this.rethrowAsUsernameConflict(error);
    }
  }

  async updatePermissions(id: number, permissions: AdminPermissions) {
    const record = await this.requireRecord(id);

    if (record.isSuperAdmin) {
      throw new ConflictException(
        'The super admin always has full access and cannot be restricted',
      );
    }

    const updated = await this.prisma.adminUser.update({
      where: { id },
      data: { permissions, tokenVersion: { increment: 1 } },
    });

    return this.toPublicAdminUser(updated);
  }

  async setPassword(id: number, password: string) {
    await this.requireRecord(id);

    const updated = await this.prisma.adminUser.update({
      where: { id },
      data: {
        passwordHash: await hashAdminPassword(password),
        tokenVersion: { increment: 1 },
      },
    });

    this.failedAttempts.delete(updated.username);

    return this.toPublicAdminUser(updated);
  }

  async changeOwnPassword(
    id: number,
    currentPassword: string,
    newPassword: string,
  ) {
    const record = await this.requireRecord(id);

    if (!(await verifyAdminPassword(currentPassword, record.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    return this.setPassword(id, newPassword);
  }

  async remove(id: number) {
    const record = await this.requireRecord(id);

    if (record.isSuperAdmin) {
      throw new ConflictException('The super admin cannot be deleted');
    }

    await this.prisma.adminUser.delete({ where: { id } });
    this.failedAttempts.delete(record.username);

    return { id };
  }

  private async requireRecord(id: number) {
    const record = await this.prisma.adminUser.findUnique({ where: { id } });

    if (!record) {
      throw new NotFoundException('Admin not found');
    }

    return record;
  }

  private isLockedOut(username: string) {
    const entry = this.failedAttempts.get(username);

    if (!entry) {
      return false;
    }

    if (entry.lockedUntil > Date.now()) {
      return true;
    }

    if (entry.lockedUntil) {
      this.failedAttempts.delete(username);
    }

    return false;
  }

  // nginx already rate-limits the login form per IP, but every request reaches
  // the backend from the same Next.js server, so the per-login counter lives
  // here instead of in ThrottlerGuard.
  private registerFailure(username: string) {
    const entry = this.failedAttempts.get(username) ?? {
      count: 0,
      lockedUntil: 0,
    };

    entry.count += 1;

    if (entry.count >= MAX_FAILED_ATTEMPTS) {
      entry.count = 0;
      entry.lockedUntil = Date.now() + LOCKOUT_MS;
    }

    this.failedAttempts.set(username, entry);
  }

  private rethrowAsUsernameConflict(error: unknown): never {
    const code = (error as Prisma.PrismaClientKnownRequestError | null)?.code;

    if (code === 'P2002') {
      throw new ConflictException('An admin with this login already exists');
    }

    throw error;
  }

  private toPublicAdminUser(record: AdminUser): PublicAdminUser {
    return {
      id: record.id,
      username: record.username,
      isSuperAdmin: record.isSuperAdmin,
      permissions: record.isSuperAdmin
        ? createAdminPermissions('manage')
        : normalizeAdminPermissions(record.permissions),
      tokenVersion: record.tokenVersion,
      lastLoginAt: record.lastLoginAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
