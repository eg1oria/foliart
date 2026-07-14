import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  const prismaServiceMock = {
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

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
});
