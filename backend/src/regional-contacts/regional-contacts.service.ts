import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type RegionalContactInput = {
  region: string;
  fullName: string;
  phone: string;
  address: string;
  sortOrder?: number;
};

@Injectable()
export class RegionalContactsService {
  constructor(private prisma: PrismaService) {}

  // Hand-picked order first, insertion order as the tie-breaker, so a new
  // region can be pinned to the top without renumbering the rest.
  findAll() {
    return this.prisma.regionalContact.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async findOne(id: number) {
    const contact = await this.prisma.regionalContact.findUnique({
      where: { id },
    });

    if (!contact) {
      throw new NotFoundException(`Regional contact #${id} not found`);
    }

    return contact;
  }

  create(input: RegionalContactInput) {
    return this.prisma.regionalContact.create({
      data: {
        region: input.region,
        fullName: input.fullName,
        phone: input.phone,
        address: input.address,
        sortOrder: input.sortOrder ?? 0,
      },
    });
  }

  async update(id: number, input: RegionalContactInput) {
    await this.findOne(id);

    return this.prisma.regionalContact.update({
      where: { id },
      data: {
        region: input.region,
        fullName: input.fullName,
        phone: input.phone,
        address: input.address,
        ...(input.sortOrder === undefined
          ? {}
          : { sortOrder: input.sortOrder }),
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.regionalContact.delete({ where: { id } });
  }
}
