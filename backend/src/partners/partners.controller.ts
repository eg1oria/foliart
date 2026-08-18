import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { AdminApiGuard } from '../admin-api.guard';
import {
  allowedImageMimeTypes,
  maxImageUploadBytes,
  optimizeUploadedImage,
  type StoredImageUploadFile,
} from '../images/image-upload.util';
import { PartnersService } from './partners.service';

const partnersImagesDirectory = join(process.cwd(), 'images', 'partners');
const storedPartnerLogoPrefix = 'partners/';
const maxPartnerFieldLength = 300;
const maxPartnerPhonesLength = 600;

type StoredUploadFile = StoredImageUploadFile & { fieldname: string };

type DestinationCallback = (error: Error | null, destination: string) => void;
type FilenameCallback = (error: Error | null, filename: string) => void;
type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void;

function ensurePartnersDirectory() {
  mkdirSync(partnersImagesDirectory, { recursive: true });
}

function removeUploadedFile(filePath?: string) {
  if (!filePath || !existsSync(filePath)) {
    return;
  }

  try {
    unlinkSync(filePath);
  } catch (error) {
    console.warn('Uploaded partner logo could not be removed', {
      message: error instanceof Error ? error.message : String(error),
      path: filePath,
    });
  }
}

/**
 * Only logos this API stored itself may be deleted: the partner seeded from
 * the old hard-coded card points at `/partners2.webp`, which ships with the
 * frontend and must survive a replacement upload.
 */
function getStoredPartnerLogoPath(logoUrl?: string) {
  if (!logoUrl) {
    return undefined;
  }

  const normalized = logoUrl.trim().replace(/\\/g, '/').replace(/^\/+/, '');

  if (!normalized.startsWith(storedPartnerLogoPrefix)) {
    return undefined;
  }

  const fileName = basename(normalized);
  if (!fileName || fileName === '.' || fileName === 'partners') {
    return undefined;
  }

  return join(partnersImagesDirectory, fileName);
}

function normalizeFileNameSegment(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9Ѐ-ӿ]+/gi, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'partner';
}

function getRequestTextField(req: Request, fieldName: string) {
  const body: unknown = req.body;

  if (!body || typeof body !== 'object') {
    return undefined;
  }

  const value = (body as Record<string, unknown>)[fieldName];
  return typeof value === 'string' ? value : undefined;
}

function createLogoInterceptor() {
  return FileInterceptor('logo', {
    storage: diskStorage({
      destination: (
        _req: Request,
        _file: StoredUploadFile,
        callback: DestinationCallback,
      ) => {
        ensurePartnersDirectory();
        callback(null, partnersImagesDirectory);
      },
      filename: (
        req: Request,
        file: StoredUploadFile,
        callback: FilenameCallback,
      ) => {
        const name = getRequestTextField(req, 'name') ?? 'partner';
        const extension = extname(file.originalname).toLowerCase() || '.jpg';
        const fileName = `${Date.now()}-${normalizeFileNameSegment(name)}${extension}`;
        callback(null, fileName);
      },
    }),
    fileFilter: (
      _req: Request,
      file: StoredUploadFile,
      callback: FileFilterCallback,
    ) => {
      if (!allowedImageMimeTypes.has(file.mimetype)) {
        callback(
          new BadRequestException(
            'Only JPG, PNG, and WEBP images are supported',
          ),
          false,
        );
        return;
      }

      callback(null, true);
    },
    limits: {
      fileSize: maxImageUploadBytes,
    },
  });
}

function parseSortOrder(value?: string) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) ? parsed : undefined;
}

// Every contact detail is optional except the name: a card simply drops the
// lines it has no data for.
function parsePartnerBody(body: Record<string, string | undefined>) {
  const text = (value: string | undefined, limit = maxPartnerFieldLength) =>
    (value ?? '').trim().slice(0, limit);

  return {
    name: text(body.name),
    address: text(body.address),
    phones: text(body.phones, maxPartnerPhonesLength)
      .split(/\r?\n/)
      .map((phone) => phone.trim())
      .filter(Boolean)
      .join('\n'),
    email: text(body.email),
    website: text(body.website),
    sortOrder: parseSortOrder(body.sortOrder),
  };
}

@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get()
  findAll() {
    return this.partnersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.partnersService.findOne(id);
  }

  @Post()
  @UseGuards(AdminApiGuard)
  @UseInterceptors(createLogoInterceptor())
  async create(
    @Body() body: Record<string, string | undefined>,
    @UploadedFile() logo?: StoredUploadFile,
  ) {
    const values = parsePartnerBody(body);

    if (!values.name) {
      removeUploadedFile(logo?.path);
      throw new BadRequestException('Partner name is required');
    }

    try {
      const logoFile = logo?.filename
        ? await optimizeUploadedImage(logo)
        : undefined;

      return await this.partnersService.create({
        ...values,
        sortOrder: values.sortOrder ?? 0,
        logoUrl: logoFile
          ? `${storedPartnerLogoPrefix}${logoFile.filename}`
          : '',
      });
    } catch (error) {
      removeUploadedFile(logo?.path);
      throw error;
    }
  }

  @Patch(':id')
  @UseGuards(AdminApiGuard)
  @UseInterceptors(createLogoInterceptor())
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, string | undefined>,
    @UploadedFile() logo?: StoredUploadFile,
  ) {
    const values = parsePartnerBody(body);

    if (!values.name) {
      removeUploadedFile(logo?.path);
      throw new BadRequestException('Partner name is required');
    }

    try {
      const logoFile = logo?.filename
        ? await optimizeUploadedImage(logo)
        : undefined;
      const previousLogoUrl = logoFile
        ? await this.partnersService.getLogoUrl(id)
        : undefined;

      const partner = await this.partnersService.update(id, {
        ...values,
        logoUrl: logoFile
          ? `${storedPartnerLogoPrefix}${logoFile.filename}`
          : undefined,
      });

      if (logoFile) {
        removeUploadedFile(getStoredPartnerLogoPath(previousLogoUrl));
      }

      return partner;
    } catch (error) {
      removeUploadedFile(logo?.path);
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(AdminApiGuard)
  async remove(@Param('id', ParseIntPipe) id: number) {
    const deletedPartner = await this.partnersService.remove(id);

    removeUploadedFile(getStoredPartnerLogoPath(deletedPartner.logoUrl));

    return { id: deletedPartner.id };
  }
}
