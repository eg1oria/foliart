import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UiMessagesService } from './ui-messages.service';

describe('UiMessagesService', () => {
  function createService(options?: {
    createError?: Error;
    existing?: {
      locale: string;
      messages: Prisma.JsonValue | null;
      revision: number;
      createdAt: Date;
      updatedAt: Date;
    } | null;
    updateCount?: number;
  }) {
    const record = {
      locale: 'ru',
      messages: { Home: { title: 'Saved' } },
      revision: 1,
      createdAt: new Date('2026-07-26T10:00:00.000Z'),
      updatedAt: new Date('2026-07-26T10:00:00.000Z'),
    };
    const transaction = {
      uiMessage: {
        create: jest.fn(() => {
          if (options?.createError) throw options.createError;
          return Promise.resolve(record);
        }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          ...record,
          revision: 2,
        }),
        updateMany: jest
          .fn()
          .mockResolvedValue({ count: options?.updateCount ?? 0 }),
      },
    };
    const prisma = {
      uiMessage: {
        findUnique: jest.fn().mockResolvedValue(options?.existing ?? null),
      },
      $transaction: jest.fn(
        async (operation: (client: typeof transaction) => Promise<unknown>) =>
          operation(transaction),
      ),
    };

    return {
      prisma,
      service: new UiMessagesService(prisma as unknown as PrismaService),
      transaction,
    };
  }

  it('returns a normal empty response when the locale has no row', async () => {
    const { service } = createService();

    await expect(service.get('ru')).resolves.toEqual({
      locale: 'ru',
      messages: null,
      revision: 0,
      updatedAt: null,
    });
  });

  it('creates the first override atomically with revision one', async () => {
    const { prisma, service, transaction } = createService();

    await expect(
      service.save('ru', { Home: { title: 'Saved' } }, 0),
    ).resolves.toMatchObject({ locale: 'ru', revision: 1 });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(transaction.uiMessage.updateMany).toHaveBeenCalledWith({
      where: { locale: 'ru', revision: 0 },
      data: {
        messages: { Home: { title: 'Saved' } },
        revision: { increment: 1 },
      },
    });
    expect(transaction.uiMessage.create).toHaveBeenCalledWith({
      data: {
        locale: 'ru',
        messages: { Home: { title: 'Saved' } },
        revision: 1,
      },
    });
  });

  it('updates only the expected revision and increments it', async () => {
    const { service, transaction } = createService({ updateCount: 1 });

    await expect(
      service.save('ru', { Home: { title: 'Updated' } }, 1),
    ).resolves.toMatchObject({ revision: 2 });

    expect(transaction.uiMessage.create).not.toHaveBeenCalled();
    expect(transaction.uiMessage.updateMany).toHaveBeenCalledWith({
      where: { locale: 'ru', revision: 1 },
      data: {
        messages: { Home: { title: 'Updated' } },
        revision: { increment: 1 },
      },
    });
  });

  it('returns 409 without writing when the expected revision is stale', async () => {
    const { service, transaction } = createService({ updateCount: 0 });

    await expect(
      service.save('ru', { Home: { title: 'Stale' } }, 4),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.uiMessage.create).not.toHaveBeenCalled();
    expect(transaction.uiMessage.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('turns a concurrent first create into a conflict', async () => {
    const createError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: Prisma.prismaVersion.client,
      },
    );
    const { service } = createService({ createError });

    await expect(
      service.save('ru', { Home: { title: 'Concurrent' } }, 0),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('resets to a nullable override while preserving optimistic locking', async () => {
    const { service, transaction } = createService({ updateCount: 1 });

    await expect(service.reset('ru', 1)).resolves.toMatchObject({
      revision: 2,
    });
    expect(transaction.uiMessage.updateMany).toHaveBeenCalledWith({
      where: { locale: 'ru', revision: 1 },
      data: {
        messages: Prisma.DbNull,
        revision: { increment: 1 },
      },
    });
  });
});
