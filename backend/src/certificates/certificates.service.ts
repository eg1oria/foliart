import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const CONFORMITY_CERTIFICATE_SLUG = 'conformity';

export type CertificateFile = {
  fileUrl: string;
  mimeType: string;
  originalName: string;
};

export type CertificateDocument = CertificateFile & {
  slug: string;
  updatedAt: Date | null;
};

// A slug with no row yet is reported as an empty document instead of a 404:
// the public catalog and the admin screen both treat "nothing uploaded" as a
// normal state, not as an error.
const emptyDocument = (slug: string): CertificateDocument => ({
  slug,
  fileUrl: '',
  mimeType: '',
  originalName: '',
  updatedAt: null,
});

@Injectable()
export class CertificatesService {
  constructor(private prisma: PrismaService) {}

  async findOne(slug: string): Promise<CertificateDocument> {
    const certificate = await this.prisma.certificate.findUnique({
      where: { slug },
    });

    return certificate ?? emptyDocument(slug);
  }

  /** Returns the file that was replaced, so the caller can delete it. */
  async save(slug: string, file: CertificateFile) {
    const previous = await this.findOne(slug);

    await this.prisma.certificate.upsert({
      where: { slug },
      create: { slug, ...file },
      update: file,
    });

    return previous;
  }

  async clear(slug: string) {
    const previous = await this.findOne(slug);

    await this.prisma.certificate.upsert({
      where: { slug },
      create: { slug },
      update: { fileUrl: '', mimeType: '', originalName: '' },
    });

    return previous;
  }
}
