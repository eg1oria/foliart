import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { diskStorage } from 'multer';
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readSync,
  unlinkSync,
} from 'node:fs';
import { basename, extname, join } from 'node:path';
import { AdminApiGuard } from '../admin-api.guard';
import {
  allowedImageMimeTypes,
  maxImageUploadBytes,
  optimizeUploadedImage,
  type StoredImageUploadFile,
} from '../images/image-upload.util';
import {
  CertificatesService,
  CONFORMITY_CERTIFICATE_SLUG,
} from './certificates.service';

const certificatesDirectory = join(process.cwd(), 'images', 'certificates');
const storedCertificatePrefix = 'certificates/';
const certificateSlugs = new Set<string>([CONFORMITY_CERTIFICATE_SLUG]);
const maxCertificatePdfUploadBytes = 20 * 1024 * 1024;
const allowedPdfMimeTypes = new Set(['application/pdf', 'application/x-pdf']);

type StoredUploadFile = StoredImageUploadFile & { size: number };

type DestinationCallback = (error: Error | null, destination: string) => void;
type FilenameCallback = (error: Error | null, filename: string) => void;
type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void;

function ensureCertificatesDirectory() {
  mkdirSync(certificatesDirectory, { recursive: true });
}

function removeUploadedFile(filePath?: string) {
  if (!filePath || !existsSync(filePath)) {
    return;
  }

  try {
    unlinkSync(filePath);
  } catch (error) {
    console.warn('Uploaded certificate file could not be removed', {
      message: error instanceof Error ? error.message : String(error),
      path: filePath,
    });
  }
}

/**
 * Only files this API stored itself may be deleted, so a `fileUrl` that still
 * points at a bundled asset survives a replacement upload.
 */
function getStoredCertificatePath(fileUrl?: string) {
  if (!fileUrl) {
    return undefined;
  }

  const normalized = fileUrl.trim().replace(/\\/g, '/').replace(/^\/+/, '');

  if (!normalized.startsWith(storedCertificatePrefix)) {
    return undefined;
  }

  const fileName = basename(normalized);
  if (!fileName || fileName === '.' || fileName === 'certificates') {
    return undefined;
  }

  return join(certificatesDirectory, fileName);
}

function isPdfUpload(file: StoredUploadFile) {
  return (
    allowedPdfMimeTypes.has(file.mimetype) ||
    extname(file.originalname).toLowerCase() === '.pdf'
  );
}

function hasPdfFileSignature(file: StoredUploadFile) {
  let descriptor: number | null = null;

  try {
    const signature = Buffer.alloc(5);
    descriptor = openSync(file.path, 'r');
    const bytesRead = readSync(descriptor, signature, 0, signature.length, 0);

    return bytesRead === signature.length && signature.toString() === '%PDF-';
  } catch {
    return false;
  } finally {
    if (descriptor !== null) {
      closeSync(descriptor);
    }
  }
}

function createCertificateInterceptor() {
  return FileInterceptor('file', {
    storage: diskStorage({
      destination: (
        _req: Request,
        _file: StoredUploadFile,
        callback: DestinationCallback,
      ) => {
        ensureCertificatesDirectory();
        callback(null, certificatesDirectory);
      },
      filename: (
        _req: Request,
        file: StoredUploadFile,
        callback: FilenameCallback,
      ) => {
        const extension = isPdfUpload(file)
          ? '.pdf'
          : extname(file.originalname).toLowerCase() || '.jpg';
        callback(null, `${Date.now()}-certificate${extension}`);
      },
    }),
    fileFilter: (
      _req: Request,
      file: StoredUploadFile,
      callback: FileFilterCallback,
    ) => {
      if (isPdfUpload(file) || allowedImageMimeTypes.has(file.mimetype)) {
        callback(null, true);
        return;
      }

      callback(
        new BadRequestException(
          'Only PDF files and JPG, PNG, or WEBP images are supported',
        ),
        false,
      );
    },
    limits: {
      fileSize: maxCertificatePdfUploadBytes,
      files: 1,
    },
  });
}

function parseCertificateSlug(slug: string) {
  if (!certificateSlugs.has(slug)) {
    throw new NotFoundException(`Certificate "${slug}" not found`);
  }

  return slug;
}

@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.certificatesService.findOne(parseCertificateSlug(slug));
  }

  @Put(':slug')
  @UseGuards(AdminApiGuard)
  @UseInterceptors(createCertificateInterceptor())
  async save(
    @Param('slug') slug: string,
    @UploadedFile() file?: StoredUploadFile,
  ) {
    let certificateSlug: string;

    try {
      certificateSlug = parseCertificateSlug(slug);
    } catch (error) {
      removeUploadedFile(file?.path);
      throw error;
    }

    if (!file?.filename) {
      throw new BadRequestException('Certificate file is required');
    }

    try {
      const stored = isPdfUpload(file)
        ? this.storePdf(file)
        : await this.storeImage(file);

      const previous = await this.certificatesService.save(certificateSlug, {
        ...stored,
        originalName: file.originalname.slice(0, 200),
      });

      removeUploadedFile(getStoredCertificatePath(previous.fileUrl));

      return this.certificatesService.findOne(certificateSlug);
    } catch (error) {
      removeUploadedFile(file.path);
      throw error;
    }
  }

  @Delete(':slug')
  @UseGuards(AdminApiGuard)
  async remove(@Param('slug') slug: string) {
    const previous = await this.certificatesService.clear(
      parseCertificateSlug(slug),
    );

    removeUploadedFile(getStoredCertificatePath(previous.fileUrl));

    return this.certificatesService.findOne(parseCertificateSlug(slug));
  }

  private storePdf(file: StoredUploadFile) {
    if (file.size > maxCertificatePdfUploadBytes) {
      throw new BadRequestException('PDF must be no larger than 20 MB');
    }

    if (!hasPdfFileSignature(file)) {
      throw new BadRequestException('PDF file could not be read');
    }

    return {
      fileUrl: `${storedCertificatePrefix}${file.filename}`,
      mimeType: 'application/pdf',
    };
  }

  // Multer's limit covers the larger PDF ceiling, so an oversized image is
  // caught here instead.
  private async storeImage(file: StoredUploadFile) {
    if (file.size > maxImageUploadBytes) {
      throw new BadRequestException('Image must be no larger than 5 MB');
    }

    const optimized = await optimizeUploadedImage(file);

    return {
      fileUrl: `${storedCertificatePrefix}${optimized.filename}`,
      mimeType: optimized.mimetype,
    };
  }
}
