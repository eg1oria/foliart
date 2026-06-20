import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('ProductsController', () => {
  let controller: ProductsController;
  const productsServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByCategory: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const prismaServiceMock = {
    product: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: productsServiceMock,
        },
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('rejects creating a product before its Russian base content exists', async () => {
    await expect(
      controller.create({
        contentLocale: 'en',
        categoryId: '1',
        name: 'Product',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(productsServiceMock.create).not.toHaveBeenCalled();
  });
});
