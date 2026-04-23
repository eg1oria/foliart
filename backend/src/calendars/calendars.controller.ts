import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { CalendarsService } from './calendars.service';

const calendarsImagesDirectory = join(process.cwd(), 'images', 'calendars');
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const calendarImageFields = ['image1', 'image2', 'image3', 'image4'] as const;
const requiredCalendarImageFields = ['image1', 'image2'] as const;

type CalendarImageField = (typeof calendarImageFields)[number];
type UploadedCalendarFiles = Partial<
  Record<
    CalendarImageField,
    Array<{
      filename: string;
      path: string;
    }>
  >
>;

function ensureCalendarsDirectory() {
  mkdirSync(calendarsImagesDirectory, { recursive: true });
}

function removeUploadedFiles(filePaths: Array<string | undefined>) {
  for (const filePath of filePaths) {
    if (!filePath || !existsSync(filePath)) {
      continue;
    }

    unlinkSync(filePath);
  }
}

function getStoredCalendarImagePath(imageUrl?: string) {
  if (!imageUrl) {
    return undefined;
  }

  const fileName = basename(imageUrl);
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

function getUploadedFile(files: UploadedCalendarFiles | undefined, fieldName: CalendarImageField) {
  return files?.[fieldName]?.[0];
}

function createImagesInterceptor() {
  return FileFieldsInterceptor(
    calendarImageFields.map((name) => ({
      name,
      maxCount: 1,
    })),
    {
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          ensureCalendarsDirectory();
          callback(null, calendarsImagesDirectory);
        },
        filename: (req, file, callback) => {
          const title = typeof req.body?.title === 'string' ? req.body.title : 'calendar-entry';
          const extension = extname(file.originalname).toLowerCase() || '.jpg';
          const fileName = `${Date.now()}-${file.fieldname}-${normalizeFileNameSegment(title)}${extension}`;
          callback(null, fileName);
        },
      }),
      fileFilter: (_req, file, callback) => {
        if (!allowedMimeTypes.has(file.mimetype)) {
          callback(
            new BadRequestException('Only JPG, PNG, and WEBP images are supported'),
            false,
          );
          return;
        }

        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: calendarImageFields.length,
      },
    },
  );
}

@Controller('calendars')
export class CalendarsController {
  constructor(private readonly calendarsService: CalendarsService) {}

  @Get()
  findAll(@Query('locale') locale?: string) {
    return this.calendarsService.findAll(locale);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Query('locale') locale?: string) {
    return this.calendarsService.findOne(id, locale);
  }

  @Post()
  @UseInterceptors(createImagesInterceptor())
  async create(
    @Body() body: Record<string, string | undefined>,
    @UploadedFiles() files?: UploadedCalendarFiles,
  ) {
    const title = body.title?.trim() ?? '';
    const titleEn = body.titleEn?.trim() ?? '';
    const description = body.description?.trim() ?? '';
    const descriptionEn = body.descriptionEn?.trim() ?? '';
    const uploadedFiles = calendarImageFields.map((fieldName) => getUploadedFile(files, fieldName));
    const requiredUploadedFiles = requiredCalendarImageFields.map((fieldName) =>
      getUploadedFile(files, fieldName),
    );

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
      return await this.calendarsService.create({
        title,
        titleEn,
        description,
        descriptionEn,
        imageUrl1: `calendars/${uploadedFiles[0]!.filename}`,
        imageUrl2: `calendars/${uploadedFiles[1]!.filename}`,
        imageUrl3: uploadedFiles[2]?.filename ? `calendars/${uploadedFiles[2].filename}` : '',
        imageUrl4: uploadedFiles[3]?.filename ? `calendars/${uploadedFiles[3].filename}` : '',
      });
    } catch (error) {
      removeUploadedFiles(uploadedFiles.map((file) => file?.path));
      throw error;
    }
  }

  @Patch(':id')
  @UseInterceptors(createImagesInterceptor())
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, string | undefined>,
    @UploadedFiles() files?: UploadedCalendarFiles,
  ) {
    const title = body.title?.trim() ?? '';
    const titleEn = body.titleEn?.trim() ?? '';
    const description = body.description?.trim() ?? '';
    const descriptionEn = body.descriptionEn?.trim() ?? '';
    const uploadedFiles = calendarImageFields.map((fieldName) => getUploadedFile(files, fieldName));

    if (!title) {
      removeUploadedFiles(uploadedFiles.map((file) => file?.path));
      throw new BadRequestException('Calendar title is required');
    }

    if (!description) {
      removeUploadedFiles(uploadedFiles.map((file) => file?.path));
      throw new BadRequestException('Calendar description is required');
    }

    try {
      const currentEntry = await this.calendarsService.findOne(id);
      const updatedEntry = await this.calendarsService.update({
        id,
        title,
        titleEn,
        description,
        descriptionEn,
        ...(uploadedFiles[0]?.filename
          ? { imageUrl1: `calendars/${uploadedFiles[0].filename}` }
          : {}),
        ...(uploadedFiles[1]?.filename
          ? { imageUrl2: `calendars/${uploadedFiles[1].filename}` }
          : {}),
        ...(uploadedFiles[2]?.filename
          ? { imageUrl3: `calendars/${uploadedFiles[2].filename}` }
          : {}),
        ...(uploadedFiles[3]?.filename
          ? { imageUrl4: `calendars/${uploadedFiles[3].filename}` }
          : {}),
      });

      const previousImageUrls = [
        currentEntry.imageUrl1,
        currentEntry.imageUrl2,
        currentEntry.imageUrl3,
        currentEntry.imageUrl4,
      ];

      removeUploadedFiles(
        uploadedFiles.map((file, index) =>
          file?.filename ? getStoredCalendarImagePath(previousImageUrls[index]) : undefined,
        ),
      );

      return updatedEntry;
    } catch (error) {
      removeUploadedFiles(uploadedFiles.map((file) => file?.path));
      throw error;
    }
  }
}
