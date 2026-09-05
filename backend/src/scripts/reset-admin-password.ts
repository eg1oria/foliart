import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createAdminPermissions } from '../admin-sections';
import { hashAdminPassword } from '../admin-users/admin-password.util';
import {
  isAdminUsername,
  normalizeAdminUsername,
} from '../admin-users/admin-users.validation';

// Recovery hatch for a lost super admin password. Run it inside the backend
// container: `npm run admin:reset-password -- <login> <new-password>`.
// A missing login is recreated as the super admin, so access can always be
// restored without touching the database by hand.
async function main() {
  const [usernameInput, password] = process.argv.slice(2);
  const username = normalizeAdminUsername(usernameInput ?? '');

  if (!isAdminUsername(username)) {
    throw new Error(
      'Usage: npm run admin:reset-password -- <login> <new-password>',
    );
  }

  if (!password) {
    throw new Error('The new password must not be empty');
  }

  const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL ?? 'file:./dev.db',
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const passwordHash = await hashAdminPassword(password);
    const existing = await prisma.adminUser.findUnique({ where: { username } });

    if (existing) {
      await prisma.adminUser.update({
        where: { id: existing.id },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      });
      console.log(`Password updated for "${username}".`);
      return;
    }

    await prisma.adminUser.create({
      data: {
        username,
        passwordHash,
        isSuperAdmin: true,
        permissions: createAdminPermissions('manage'),
      },
    });
    console.log(`Created the super admin account "${username}".`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error(
    'Admin password reset failed:',
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
