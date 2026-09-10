import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  const categoryMock = {
    create: jest.fn(),
    delete: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  };
  const productMock = {
    count: jest.fn(),
  };
  const transactionClientMock = {
    category: categoryMock,
    product: productMock,
  };
  const prismaServiceMock = {
    ...transactionClientMock,
    $transaction: jest.fn(
      async (
        operation: (tx: typeof transactionClientMock) => Promise<unknown>,
      ) => operation(transactionClientMock),
    ),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns the persisted canonical slug', async () => {
    prismaServiceMock.category.findMany.mockResolvedValue([
      {
        id: 1,
        slug: 'monoprodukty',
        name: 'Монопродукты',
        nameEn: 'Single products',
        description: '',
        descriptionEn: '',
        imageUrl: '',
        productCount: 0,
        translations: [],
      },
    ]);

    await expect(service.findAll('en')).resolves.toEqual([
      expect.objectContaining({
        id: 1,
        slug: 'monoprodukty',
        name: 'Single products',
      }),
    ]);
  });

  it('creates a category with a unique slug derived from the Russian name', async () => {
    prismaServiceMock.category.findFirst
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce(null);
    prismaServiceMock.category.create.mockResolvedValue({ id: 9 });

    await expect(
      service.create({
        locale: 'ru',
        name: 'Биопрепараты',
        description: 'Описание',
      }),
    ).resolves.toEqual({ id: 9 });

    expect(prismaServiceMock.category.create).toHaveBeenCalledWith({
      data: {
        slug: 'biopreparaty-2',
        name: 'Биопрепараты',
        nameEn: '',
        description: 'Описание',
        descriptionEn: '',
        imageUrl: '',
        productCount: 0,
        translations: {
          create: {
            locale: 'ru',
            name: 'Биопрепараты',
            description: 'Описание',
          },
        },
      },
    });
  });

  it('refuses to delete a category that still holds products', async () => {
    prismaServiceMock.category.findUnique.mockResolvedValue({
      id: 4,
      name: 'Монопродукты',
      imageUrl: 'categories/stored.webp',
    });
    prismaServiceMock.product.count.mockResolvedValue(3);

    await expect(service.remove(4)).rejects.toBeInstanceOf(ConflictException);
    expect(prismaServiceMock.category.delete).not.toHaveBeenCalled();
  });

  it('deletes an empty category and reports its stored image', async () => {
    prismaServiceMock.category.findUnique.mockResolvedValue({
      id: 4,
      name: 'Монопродукты',
      imageUrl: 'categories/stored.webp',
    });
    prismaServiceMock.product.count.mockResolvedValue(0);
    prismaServiceMock.category.delete.mockResolvedValue({ id: 4 });

    await expect(service.remove(4)).resolves.toEqual({
      id: 4,
      name: 'Монопродукты',
      imageUrl: 'categories/stored.webp',
    });
    expect(prismaServiceMock.category.delete).toHaveBeenCalledWith({
      where: { id: 4 },
    });
  });

  it('reports the live product relation count', async () => {
    prismaServiceMock.category.findMany.mockResolvedValue([
      {
        id: 1,
        slug: 'monoprodukty',
        name: 'Монопродукты',
        nameEn: '',
        description: '',
        descriptionEn: '',
        imageUrl: '',
        productCount: 7,
        _count: { products: 2 },
        translations: [],
      },
    ]);

    await expect(service.findAll()).resolves.toEqual([
      expect.objectContaining({ productCount: 2 }),
    ]);
  });
});
