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
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage, MulterFile } from 'multer';
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
  DEFAULT_CONTENT_LOCALE,
  isSupportedContentLocale,
} from '../content-locales';
import {
  allowedImageMimeTypes,
  maxImageUploadBytes,
  optimizeUploadedImage,
  type StoredImageUploadFile,
} from '../images/image-upload.util';
import { CalendarsService } from './calendars.service';

const calendarsImagesDirectory = join(process.cwd(), 'images', 'calendars');
const calendarImageFields = ['image1', 'image2', 'image3', 'image4'] as const;
const requiredCalendarImageFields = ['image1', 'image2'] as const;
const calendarPdfField = 'pdf' as const;
const calendarUploadFields = [
  ...calendarImageFields,
  calendarPdfField,
] as const;
const maxCalendarPdfUploadBytes = 20 * 1024 * 1024;
const allowedPdfMimeTypes = new Set(['application/pdf', 'application/x-pdf']);

type CalendarUploadField = (typeof calendarUploadFields)[number];

type StoredUploadFile = StoredImageUploadFile & {
  fieldname: CalendarUploadField;
  size: number;
};

type UploadedCalendarFiles = Partial<
  Record<CalendarUploadField, StoredUploadFile[]>
>;

type DestinationCallback = (error: Error | null, destination: string) => void;
type FilenameCallback = (error: Error | null, filename: string) => void;
type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void;

function ensureCalendarsDirectory() {
  mkdirSync(calendarsImagesDirectory, { recursive: true });
}

function removeUploadedFiles(filePaths: Array<string | undefined>) {
  for (const filePath of filePaths) {
    if (!filePath || !existsSync(filePath)) {
      continue;
    }

    try {
      unlinkSync(filePath);
    } catch (error) {
      console.warn('Uploaded calendar file could not be removed', {
        message: error instanceof Error ? error.message : String(error),
        path: filePath,
      });
    }
  }
}

function getStoredCalendarFilePath(fileUrl?: string) {
  if (!fileUrl) {
    return undefined;
  }

  const fileName = basename(fileUrl);
  if (!fileName || fileName === '.' || fileName === 'calendars') {
    return undefined;
  }

  return join(calendarsImagesDirectory, fileName);
}

function normalizeFileNameSegment(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9\u0400-\u04ff]+/gi, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'calendar-entry';
}

function getRequestTextField(req: Request, fieldName: string) {
  const body: unknown = req.body;

  if (!body || typeof body !== 'object') {
    return undefined;
  }

  const value = (body as Record<string, unknown>)[fieldName];
  return typeof value === 'string' ? value : undefined;
}

function getUploadedFile(
  files: UploadedCalendarFiles | undefined,
  fieldName: CalendarUploadField,
) {
  return files?.[fieldName]?.[0];
}

function validateUploadedImages(files: Array<StoredUploadFile | undefined>) {
  const oversizedImage = files.find(
    (file) => file && file.size > maxImageUploadBytes,
  );

  if (oversizedImage) {
    throw new BadRequestException(
      'Calendar images must be no larger than 5 MB',
    );
  }
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

function validateUploadedPdf(file?: StoredUploadFile) {
  if (!file) {
    return;
  }

  if (file.size > maxCalendarPdfUploadBytes) {
    throw new BadRequestException('PDF must be no larger than 20 MB');
  }

  if (!hasPdfFileSignature(file)) {
    throw new BadRequestException('PDF file could not be read');
  }
}

function createCalendarFilesInterceptor() {
  return FileFieldsInterceptor(
    calendarUploadFields.map((name) => ({
      name,
      maxCount: 1,
    })),
    {
      storage: diskStorage({
        destination: (
          _req: Request,
          _file: MulterFile,
          callback: DestinationCallback,
        ) => {
          ensureCalendarsDirectory();
          callback(null, calendarsImagesDirectory);
        },
        filename: (
          req: Request,
          file: MulterFile,
          callback: FilenameCallback,
        ) => {
          const title = getRequestTextField(req, 'title') ?? 'calendar-entry';
          const extension =
            file.fieldname === calendarPdfField
              ? '.pdf'
              : extname(file.originalname).toLowerCase() || '.jpg';
          const fileName = `${Date.now()}-${file.fieldname}-${normalizeFileNameSegment(title)}${extension}`;
          callback(null, fileName);
        },
      }),
      fileFilter: (
        _req: Request,
        file: MulterFile,
        callback: FileFilterCallback,
      ) => {
        if (file.fieldname === calendarPdfField) {
          const originalExtension = extname(file.originalname).toLowerCase();

          if (
            !allowedPdfMimeTypes.has(file.mimetype) &&
            originalExtension !== '.pdf'
          ) {
            callback(
              new BadRequestException('Only PDF files are supported'),
              false,
            );
            return;
          }

          callback(null, true);
          return;
        }

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
        fileSize: maxCalendarPdfUploadBytes,
        files: calendarUploadFields.length,
      },
    },
  );
}

@Controller('calendars')
export class CalendarsController {
  constructor(private readonly calendarsService: CalendarsService) {}

  @Get()
  findAll(
    @Query('locale') locale?: string,
    @Query('contentLocale') contentLocale?: string,
  ) {
    return this.calendarsService.findAll(locale, contentLocale);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('locale') locale?: string,
    @Query('contentLocale') contentLocale?: string,
  ) {
    return this.calendarsService.findOne(id, locale, contentLocale);
  }

  @Post()
  @UseGuards(AdminApiGuard)
  @UseInterceptors(createCalendarFilesInterceptor())
  async create(
    @Body() body: Record<string, string | undefined>,
    @UploadedFiles() files?: UploadedCalendarFiles,
  ) {
    const contentLocale = body.contentLocale?.trim().toLowerCase();
    const title = body.title?.trim() ?? '';
    const description = body.description?.trim() ?? '';
    const uploadedImageFiles = calendarImageFields.map((fieldName) =>
      getUploadedFile(files, fieldName),
    );
    const uploadedPdfFile = getUploadedFile(files, calendarPdfField);
    const uploadedFiles = [...uploadedImageFiles, uploadedPdfFile];
    const requiredUploadedFiles = requiredCalendarImageFields.map((fieldName) =>
      getUploadedFile(files, fieldName),
    );

    if (!isSupportedContentLocale(contentLocale)) {
      removeUploadedFiles(uploadedFiles.map((file) => file?.path));
      throw new BadRequestException('Unsupported content locale');
    }

    if (contentLocale !== DEFAULT_CONTENT_LOCALE) {
      removeUploadedFiles(uploadedFiles.map((file) => file?.path));
      throw new BadRequestException(
        'Calendar entries must be created in Russian first',
      );
    }

    if (!title) {
      removeUploadedFiles(uploadedFiles.map((file) => file?.path));
      throw new BadRequestException('Calendar title is required');
    }

    if (!description) {
      removeUploadedFiles(uploadedFiles.map((file) => file?.path));
      throw new BadRequestException('Calendar description is required');
    }

    if (requiredUploadedFiles.some((file) => !file?.filename)) {
      removeUploadedFiles(uploadedFiles.map((file) => file?.path));
      throw new BadRequestException('The first 2 calendar images are required');
    }

    try {
      validateUploadedImages(uploadedImageFiles);
      validateUploadedPdf(uploadedPdfFile);

      const optimizedFiles = await Promise.all(
        uploadedImageFiles.map((file) =>
          file ? optimizeUploadedImage(file) : Promise.resolve(undefined),
        ),
      );

      return await this.calendarsService.create({
        contentLocale,
        title,
        description,
        imageUrl1: `calendars/${optimizedFiles[0]!.filename}`,
        imageUrl2: `calendars/${optimizedFiles[1]!.filename}`,
        imageUrl3: optimizedFiles[2]?.filename
          ? `calendars/${optimizedFiles[2].filename}`
          : '',
        imageUrl4: optimizedFiles[3]?.filename
          ? `calendars/${optimizedFiles[3].filename}`
          : '',
        pdfUrl: uploadedPdfFile?.filename
          ? `calendars/${uploadedPdfFile.filename}`
          : '',
      });
    } catch (error) {
      removeUploadedFiles(uploadedFiles.map((file) => file?.path));
      throw error;
    }
  }

  @Patch(':id')
  @UseGuards(AdminApiGuard)
  @UseInterceptors(createCalendarFilesInterceptor())
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, string | undefined>,
    @UploadedFiles() files?: UploadedCalendarFiles,
  ) {
    const contentLocale = body.contentLocale?.trim().toLowerCase();
    const title = body.title?.trim() ?? '';
    const description = body.description?.trim() ?? '';
    const uploadedImageFiles = calendarImageFields.map((fieldName) =>
      getUploadedFile(files, fieldName),
    );
    const uploadedPdfFile = getUploadedFile(files, calendarPdfField);
    const uploadedFiles = [...uploadedImageFiles, uploadedPdfFile];

    if (!isSupportedContentLocale(contentLocale)) {
      removeUploadedFiles(uploadedFiles.map((file) => file?.path));
      throw new BadRequestException('Unsupported content locale');
    }

    if (!title) {
      removeUploadedFiles(uploadedFiles.map((file) => file?.path));
      throw new BadRequestException('Calendar title is required');
    }

    if (!description) {
      removeUploadedFiles(uploadedFiles.map((file) => file?.path));
      throw new BadRequestException('Calendar description is required');
    }

    try {
      validateUploadedImages(uploadedImageFiles);
      validateUploadedPdf(uploadedPdfFile);

      const optimizedFiles = await Promise.all(
        uploadedImageFiles.map((file) =>
          file ? optimizeUploadedImage(file) : Promise.resolve(undefined),
        ),
      );
      const currentEntry = await this.calendarsService.findOne(
        id,
        undefined,
        contentLocale,
      );
      const updatedEntry = await this.calendarsService.update({
        id,
        contentLocale,
        title,
        description,
        ...(optimizedFiles[0]?.filename
          ? { imageUrl1: `calendars/${optimizedFiles[0].filename}` }
          : {}),
        ...(optimizedFiles[1]?.filename
          ? { imageUrl2: `calendars/${optimizedFiles[1].filename}` }
          : {}),
        ...(optimizedFiles[2]?.filename
          ? { imageUrl3: `calendars/${optimizedFiles[2].filename}` }
          : {}),
        ...(optimizedFiles[3]?.filename
          ? { imageUrl4: `calendars/${optimizedFiles[3].filename}` }
          : {}),
        ...(uploadedPdfFile?.filename
          ? { pdfUrl: `calendars/${uploadedPdfFile.filename}` }
          : {}),
      });
      const previousLocalizedImageUrl3 =
        contentLocale === DEFAULT_CONTENT_LOCALE
          ? currentEntry.imageUrl3
          : currentEntry.adminTranslation?.imageUrl3;

      const previousImageUrls = [
        currentEntry.imageUrl1,
        currentEntry.imageUrl2,
        previousLocalizedImageUrl3,
        currentEntry.imageUrl4,
      ];

      removeUploadedFiles([
        ...optimizedFiles.map((file, index) =>
          file?.filename
            ? getStoredCalendarFilePath(previousImageUrls[index])
            : undefined,
        ),
        uploadedPdfFile?.filename
          ? getStoredCalendarFilePath(currentEntry.pdfUrl)
          : undefined,
      ]);

      return updatedEntry;
    } catch (error) {
      removeUploadedFiles(uploadedFiles.map((file) => file?.path));
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(AdminApiGuard)
  async remove(@Param('id', ParseIntPipe) id: number) {
    const deletedEntry = await this.calendarsService.remove(id);

    removeUploadedFiles([
      getStoredCalendarFilePath(deletedEntry.imageUrl1),
      getStoredCalendarFilePath(deletedEntry.imageUrl2),
      getStoredCalendarFilePath(deletedEntry.imageUrl3),
      getStoredCalendarFilePath(deletedEntry.imageUrl4),
      getStoredCalendarFilePath(deletedEntry.pdfUrl),
      ...deletedEntry.translations.map((translation) =>
        getStoredCalendarFilePath(translation.imageUrl3),
      ),
    ]);

    return { id: deletedEntry.id };
  }
}
