import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  const prismaServiceMock = {
    category: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    product: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const baseProduct = {
    id: 1,
    categoryId: 1,
    name: 'Риза',
    nameEn: '',
    description: 'Русское описание',
    descriptionEn: '',
    advantages: 'Русское преимущество',
    advantagesEn: '',
    composition: 'Азот | 20 г/л',
    compositionEn: '',
    application: 'Русская схема',
    applicationEn: '',
    imageUrl: 'products/riza.webp',
    imageUrlEn: 'products/riza-international.webp',
    translations: [
      {
        id: 1,
        productId: 1,
        locale: 'ru',
        name: 'Риза',
        description: 'Русское описание',
        advantages: 'Русское преимущество',
        composition: 'Азот | 20 г/л',
        application: 'Русская схема',
      },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns the requested translation when it exists', async () => {
    prismaServiceMock.product.findMany.mockResolvedValue([
      {
        ...baseProduct,
        translations: [
          ...baseProduct.translations,
          {
            id: 2,
            productId: 1,
            locale: 'en',
            name: 'Riza',
            description: 'English description',
            advantages: 'English advantage',
            composition: 'Nitrogen | 20 g/l',
            application: 'English guide',
          },
        ],
      },
    ]);

    const products = await service.findAll('en');

    expect(products[0]).toMatchObject({
      name: 'Riza',
      description: 'English description',
      advantages: 'English advantage',
      composition: 'Nitrogen | 20 g/l',
      application: 'English guide',
      imageUrl: 'products/riza-international.webp',
      slugSourceName: 'Риза',
    });
  });

  it('keeps the Russian image for Russian and falls back to it without an international image', async () => {
    prismaServiceMock.product.findMany.mockResolvedValue([
      { ...baseProduct, imageUrlEn: '' },
    ]);

    const russianProducts = await service.findAll('ru');
    const frenchProducts = await service.findAll('fr');

    expect(russianProducts[0].imageUrl).toBe('products/riza.webp');
    expect(frenchProducts[0].imageUrl).toBe('products/riza.webp');
  });

  it.each(['en', 'fr', 'es'])(
    'uses the international image for the %s catalog',
    async (locale) => {
      prismaServiceMock.product.findMany.mockResolvedValue([baseProduct]);

      const products = await service.findAll(locale);

      expect(products[0].imageUrl).toBe('products/riza-international.webp');
    },
  );

  it('falls back to Russian text when the requested translation is empty', async () => {
    prismaServiceMock.product.findMany.mockResolvedValue([
      {
        ...baseProduct,
        translations: [
          ...baseProduct.translations,
          {
            id: 2,
            productId: 1,
            locale: 'en',
            name: '',
            description: '',
            advantages: '',
            composition: '',
            application: '',
          },
        ],
      },
    ]);

    const products = await service.findAll('en', 'en');

    expect(products[0]).toMatchObject({
      name: 'Риза',
      description: 'Русское описание',
      adminTranslation: {
        locale: 'en',
        isComplete: false,
        name: '',
      },
    });
  });

  it('updates only the selected translation and mirrors legacy English columns', async () => {
    prismaServiceMock.product.findUnique.mockResolvedValue(baseProduct);
    prismaServiceMock.category.findUnique.mockResolvedValue({ id: 1 });
    prismaServiceMock.product.update.mockResolvedValue({
      ...baseProduct,
      nameEn: 'Riza',
    });

    await service.update({
      id: 1,
      categoryId: 1,
      contentLocale: 'en',
      name: 'Riza',
      description: 'English description',
      advantages: 'English advantage',
      composition: 'Nitrogen | 20 g/l',
      application: 'English guide',
      imageUrlEn: 'products/riza-new-international.webp',
    });

    expect(prismaServiceMock.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({
          nameEn: 'Riza',
          descriptionEn: 'English description',
          imageUrlEn: 'products/riza-new-international.webp',
          translations: {
            upsert: expect.objectContaining({
              where: {
                productId_locale: {
                  productId: 1,
                  locale: 'en',
                },
              },
            }),
          },
        }),
      }),
    );
    expect(
      prismaServiceMock.product.update.mock.calls[0][0].data.name,
    ).toBeUndefined();
  });
});
