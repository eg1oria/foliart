import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AdminApiGuard } from '../admin-api.guard';
import { AdminUsersService } from './admin-users.service';
import {
  parseAdminUserId,
  parseAuthenticateBody,
  parseChangePasswordBody,
  parseCreateAdminUserBody,
  parseSetPasswordBody,
  parseUpdateAdminUserBody,
} from './admin-users.validation';

@Controller('admin-users')
@UseGuards(AdminApiGuard)
export class AdminUsersController {
  constructor(private readonly adminUsers: AdminUsersService) {}

  @Post('authenticate')
  authenticate(@Body() body: unknown) {
    const { username, password } = parseAuthenticateBody(body);
    return this.adminUsers.authenticate(username, password);
  }

  @Get()
  list() {
    return this.adminUsers.list();
  }

  @Get(':id')
  find(@Param('id') id: string) {
    return this.adminUsers.findById(parseAdminUserId(id));
  }

  @Post()
  create(@Body() body: unknown) {
    return this.adminUsers.create(parseCreateAdminUserBody(body));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    const { permissions } = parseUpdateAdminUserBody(body);
    return this.adminUsers.updatePermissions(parseAdminUserId(id), permissions);
  }

  @Put(':id/password')
  setPassword(@Param('id') id: string, @Body() body: unknown) {
    const { password } = parseSetPasswordBody(body);
    return this.adminUsers.setPassword(parseAdminUserId(id), password);
  }

  @Post(':id/password/change')
  changePassword(@Param('id') id: string, @Body() body: unknown) {
    const { currentPassword, newPassword } = parseChangePasswordBody(body);
    return this.adminUsers.changeOwnPassword(
      parseAdminUserId(id),
      currentPassword,
      newPassword,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adminUsers.remove(parseAdminUserId(id));
  }
}
