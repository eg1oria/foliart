import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AdminApiGuard } from '../admin-api.guard';
import { BackupsService } from './backups.service';

// Only the frontend server talks to this controller, after it has checked that
// the signed-in admin is the super admin: an archive holds the whole database,
// password hashes included.
@Controller('backups')
@UseGuards(AdminApiGuard)
export class BackupsController {
  constructor(private readonly backups: BackupsService) {}

  @Get()
  list() {
    return this.backups.list();
  }

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  create() {
    return this.backups.create();
  }

  @Delete(':name')
  @HttpCode(204)
  async remove(@Param('name') name: string) {
    await this.backups.remove(name);
  }

  @Get(':name/download')
  async download(
    @Param('name') name: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { size, stream } = await this.backups.openDownload(name);
    response.setHeader('Cache-Control', 'no-store');

    return new StreamableFile(stream, {
      type: 'application/gzip',
      disposition: `attachment; filename="${name}"`,
      length: size,
    });
  }

  @Post(':name/restore')
  @HttpCode(202)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  restore(@Param('name') name: string) {
    return this.backups.prepareRestore(name);
  }
}
