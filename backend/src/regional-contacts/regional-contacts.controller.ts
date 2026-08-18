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
  UseGuards,
} from '@nestjs/common';
import { AdminApiGuard } from '../admin-api.guard';
import { RegionalContactsService } from './regional-contacts.service';

const maxFieldLength = 300;

function parseSortOrder(value?: string | number) {
  const parsed =
    typeof value === 'number' ? value : Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) ? parsed : undefined;
}

// Only the region is required; the other lines are dropped from the public
// card when they are empty.
function parseBody(body: Record<string, string | number | undefined>) {
  const text = (value: string | number | undefined) =>
    typeof value === 'string' ? value.trim().slice(0, maxFieldLength) : '';

  return {
    region: text(body.region),
    fullName: text(body.fullName),
    phone: text(body.phone),
    address: text(body.address),
    sortOrder: parseSortOrder(body.sortOrder),
  };
}

@Controller('regional-contacts')
export class RegionalContactsController {
  constructor(
    private readonly regionalContactsService: RegionalContactsService,
  ) {}

  @Get()
  findAll() {
    return this.regionalContactsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.regionalContactsService.findOne(id);
  }

  @Post()
  @UseGuards(AdminApiGuard)
  create(@Body() body: Record<string, string | number | undefined>) {
    const values = parseBody(body);

    if (!values.region) {
      throw new BadRequestException('Region is required');
    }

    return this.regionalContactsService.create(values);
  }

  @Patch(':id')
  @UseGuards(AdminApiGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, string | number | undefined>,
  ) {
    const values = parseBody(body);

    if (!values.region) {
      throw new BadRequestException('Region is required');
    }

    return this.regionalContactsService.update(id, values);
  }

  @Delete(':id')
  @UseGuards(AdminApiGuard)
  async remove(@Param('id', ParseIntPipe) id: number) {
    const deleted = await this.regionalContactsService.remove(id);

    return { id: deleted.id };
  }
}
