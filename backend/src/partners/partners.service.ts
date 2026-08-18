import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type PartnerInput = {
  name: string;
  address: string;
  phones: string;
  email: string;
  website: string;
  logoUrl?: string;
};

@Injectable()
export class PartnersService {
  constructor(private prisma: PrismaService) {}

  // Partner cards are ordered by hand first and only fall back to insertion
  // order, so an admin can move a new partner to the top without renumbering
  // everyone else.
  private readonly ordering = [{ sortOrder: 'asc' }, { id: 'asc' }] as const;

  findAll() {
    return this.prisma.partner.findMany({ orderBy: [...this.ordering] });
  }

  async findOne(id: number) {
    const partner = await this.prisma.partner.findUnique({ where: { id } });

    if (!partner) {
      throw new NotFoundException(`Partner #${id} not found`);
    }

    return partner;
  }

  async getLogoUrl(id: number) {
    const partner = await this.prisma.partner.findUnique({
      where: { id },
      select: { logoUrl: true },
    });

    if (!partner) {
      throw new NotFoundException(`Partner #${id} not found`);
    }

    return partner.logoUrl;
  }

  create(input: PartnerInput & { sortOrder: number }) {
    return this.prisma.partner.create({
      data: {
        name: input.name,
        address: input.address,
        phones: input.phones,
        email: input.email,
        website: input.website,
        logoUrl: input.logoUrl ?? '',
        sortOrder: input.sortOrder,
      },
    });
  }

  async update(id: number, input: PartnerInput & { sortOrder?: number }) {
    await this.getLogoUrl(id);

    return this.prisma.partner.update({
      where: { id },
      data: {
        name: input.name,
        address: input.address,
        phones: input.phones,
        email: input.email,
        website: input.website,
        ...(input.logoUrl ? { logoUrl: input.logoUrl } : {}),
        ...(input.sortOrder === undefined
          ? {}
          : { sortOrder: input.sortOrder }),
      },
    });
  }

  async remove(id: number) {
    await this.getLogoUrl(id);

    return this.prisma.partner.delete({ where: { id } });
  }
}
