import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  SocialLinkInput,
  SocialLinkLocale,
} from './social-links.validation';

@Injectable()
export class SocialLinksService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(locale: SocialLinkLocale) {
    return this.prisma.socialLink.findMany({
      where: { locale },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  /**
   * The admin screen edits one language as a whole — rows are added, reordered
   * and dropped in a single form — so a save replaces the language's set rather
   * than diffing it. Wrapped in a transaction: a failure halfway through would
   * otherwise leave the header with no badges at all.
   */
  async replaceAll(locale: SocialLinkLocale, links: SocialLinkInput[]) {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.socialLink.deleteMany({ where: { locale } });

      for (const [index, link] of links.entries()) {
        await transaction.socialLink.create({
          data: {
            locale,
            label: link.label,
            href: link.href,
            icon: link.icon,
            text: link.text,
            sortOrder: index,
          },
        });
      }
    });

    return this.findAll(locale);
  }
}
