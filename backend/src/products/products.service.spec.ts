import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  const categoryMock = {
    findUnique: jest.fn(),
    update: jest.fn(),
  };
  const productMock = {
    count: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  };
  const transactionClientMock = {
    category: categoryMock,
    product: productMock,
  };
  const transactionMock = jest.fn(
    async (operation: (tx: typeof transactionClientMock) => Promise<unknown>) =>
      operation(transactionClientMock),
  );
  const prismaServiceMock = {
    ...transactionClientMock,
    $transaction: transactionMock,
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

    type ProductUpdateCall = {
      where: { id: number };
      data: Record<string, unknown> & {
        translations: {
          upsert: {
            where: { productId_locale: { productId: number; locale: string } };
          };
        };
      };
    };
    const updateCalls = prismaServiceMock.product.update.mock
      .calls as unknown as Array<[ProductUpdateCall]>;
    const updateCall = updateCalls[0]?.[0];

    expect(updateCall?.where).toEqual({ id: 1 });
    expect(updateCall?.data).toMatchObject({
      nameEn: 'Riza',
      descriptionEn: 'English description',
      imageUrlEn: 'products/riza-new-international.webp',
    });
    expect(updateCall?.data.translations.upsert.where).toEqual({
      productId_locale: {
        productId: 1,
        locale: 'en',
      },
    });
    expect(updateCall?.data.name).toBeUndefined();
    expect(prismaServiceMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it('creates a product and updates its category count in one transaction', async () => {
    prismaServiceMock.category.findUnique.mockResolvedValue({ id: 1 });
    prismaServiceMock.product.create.mockResolvedValue(baseProduct);
    prismaServiceMock.product.count.mockResolvedValue(1);
    prismaServiceMock.category.update.mockResolvedValue({
      id: 1,
      productCount: 1,
    });

    await service.create({
      categoryId: 1,
      contentLocale: 'ru',
      name: 'Риза',
      description: 'Описание',
      advantages: 'Преимущество',
      composition: 'Азот | 20 г/л',
      application: 'Схема',
      imageUrl: 'products/riza.webp',
    });

    expect(prismaServiceMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaServiceMock.product.create).toHaveBeenCalledTimes(1);
    type ProductCreateCall = { data: { slug: string } };
    const createCalls = prismaServiceMock.product.create.mock
      .calls as unknown as Array<[ProductCreateCall]>;
    expect(createCalls[0]?.[0].data.slug).toBe('riza');
    expect(prismaServiceMock.category.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { productCount: 1 },
    });
  });

  it('adds a suffix when a product slug is already occupied', async () => {
    prismaServiceMock.category.findUnique.mockResolvedValue({ id: 1 });
    prismaServiceMock.product.findFirst
      .mockResolvedValueOnce({ id: 3 })
      .mockResolvedValueOnce(null);
    prismaServiceMock.product.create.mockResolvedValue({
      ...baseProduct,
      id: 4,
      slug: 'riza-2',
    });
    prismaServiceMock.product.count.mockResolvedValue(2);

    await service.create({
      categoryId: 1,
      contentLocale: 'ru',
      name: 'Риза',
      description: 'Описание',
      advantages: '',
      composition: '',
      application: '',
      imageUrl: 'products/riza-2.webp',
    });

    type ProductCreateCall = { data: { slug: string } };
    const createCalls = prismaServiceMock.product.create.mock
      .calls as unknown as Array<[ProductCreateCall]>;
    expect(createCalls[0]?.[0].data.slug).toBe('riza-2');
  });

  it('updates both category counts when a product moves categories', async () => {
    prismaServiceMock.product.findUnique.mockResolvedValue(baseProduct);
    prismaServiceMock.category.findUnique.mockResolvedValue({ id: 2 });
    prismaServiceMock.product.update.mockResolvedValue({
      ...baseProduct,
      categoryId: 2,
    });
    prismaServiceMock.product.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(3);

    await service.update({
      id: 1,
      categoryId: 2,
      contentLocale: 'ru',
      name: 'Риза',
      description: 'Описание',
      advantages: 'Преимущество',
      composition: 'Азот | 20 г/л',
      application: 'Схема',
    });

    expect(prismaServiceMock.category.update).toHaveBeenNthCalledWith(1, {
      where: { id: 1 },
      data: { productCount: 0 },
    });
    expect(prismaServiceMock.category.update).toHaveBeenNthCalledWith(2, {
      where: { id: 2 },
      data: { productCount: 3 },
    });
    expect(prismaServiceMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it('deletes a product and refreshes its category count in one transaction', async () => {
    prismaServiceMock.product.findUnique.mockResolvedValue(baseProduct);
    prismaServiceMock.product.delete.mockResolvedValue(baseProduct);
    prismaServiceMock.product.count.mockResolvedValue(2);
    prismaServiceMock.category.update.mockResolvedValue({
      id: 1,
      productCount: 2,
    });

    const deletedProduct = await service.remove(1);

    expect(deletedProduct).toMatchObject({
      id: 1,
      categoryId: 1,
      imageUrl: 'products/riza.webp',
      imageUrlEn: 'products/riza-international.webp',
    });
    expect(prismaServiceMock.product.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
    expect(prismaServiceMock.category.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { productCount: 2 },
    });
    expect(prismaServiceMock.$transaction).toHaveBeenCalledTimes(1);
  });
});
