import { Test, TestingModule } from '@nestjs/testing';
import { AdminApiGuard } from '../admin-api.guard';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

describe('AdminUsersController', () => {
  let controller: AdminUsersController;
  const adminUsersServiceMock = {
    authenticate: jest.fn(),
    list: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updatePermissions: jest.fn(),
    setPassword: jest.fn(),
    changeOwnPassword: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminUsersController],
      providers: [
        { provide: AdminUsersService, useValue: adminUsersServiceMock },
      ],
    }).compile();

    controller = module.get(AdminUsersController);
  });

  it('keeps every route behind the admin secret guard', () => {
    expect(Reflect.getMetadata('__guards__', AdminUsersController)).toEqual([
      AdminApiGuard,
    ]);
  });

  it('normalizes the login before authenticating', async () => {
    await controller.authenticate({
      username: '  Editor ',
      password: 'long-enough-password',
    });

    expect(adminUsersServiceMock.authenticate).toHaveBeenCalledWith(
      'editor',
      'long-enough-password',
    );
  });

  it('parses the id parameter', async () => {
    await controller.find('7');

    expect(adminUsersServiceMock.findById).toHaveBeenCalledWith(7);
  });

  it('rejects a non-numeric id', () => {
    expect(() => controller.remove('abc')).toThrow(
      'Admin id must be a positive integer',
    );
  });
});
