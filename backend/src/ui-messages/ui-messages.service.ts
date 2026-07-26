import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  UiMessageDocument,
  UiMessageLocale,
} from './ui-messages.validation';

@Injectable()
export class UiMessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async get(locale: UiMessageLocale) {
    const record = await this.prisma.uiMessage.findUnique({
      where: { locale },
    });

    return (
      record ?? {
        locale,
        messages: null,
        revision: 0,
        updatedAt: null,
      }
    );
  }

  save(
    locale: UiMessageLocale,
    messages: UiMessageDocument,
    expectedRevision: number,
  ) {
    return this.write(locale, messages, expectedRevision);
  }

  reset(locale: UiMessageLocale, expectedRevision: number) {
    return this.write(locale, null, expectedRevision);
  }

  private async write(
    locale: UiMessageLocale,
    messages: UiMessageDocument | null,
    expectedRevision: number,
  ) {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const updated = await transaction.uiMessage.updateMany({
          where: { locale, revision: expectedRevision },
          data: {
            messages:
              messages === null
                ? Prisma.DbNull
                : (messages as Prisma.InputJsonValue),
            revision: { increment: 1 },
          },
        });

        if (updated.count === 1) {
          return transaction.uiMessage.findUniqueOrThrow({
            where: { locale },
          });
        }

        if (expectedRevision !== 0) {
          throw new ConflictException(
            'UI messages were changed in another session',
          );
        }

        return transaction.uiMessage.create({
          data: {
            locale,
            messages:
              messages === null
                ? Prisma.DbNull
                : (messages as Prisma.InputJsonValue),
            revision: 1,
          },
        });
      });
    } catch (error) {
      if (
        error instanceof ConflictException ||
        (error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002')
      ) {
        throw new ConflictException(
          'UI messages were changed in another session',
        );
      }

      throw error;
    }
  }
}
