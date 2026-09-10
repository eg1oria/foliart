import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { optimizeUploadedImage } from '../images/image-upload.util';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

// Only the pieces the controller pulls in: the upload guards it hands to
// multer, plus the re-encoder the test drives directly.
jest.mock('../images/image-upload.util', () => ({
  allowedImageMimeTypes: new Set(['image/jpeg', 'image/png', 'image/webp']),
  maxImageUploadBytes: 5 * 1024 * 1024,
  optimizeUploadedImage: jest.fn(),
}));

const optimizeUploadedImageMock = optimizeUploadedImage as jest.MockedFunction<
  typeof optimizeUploadedImage
>;

describe('CategoriesController', () => {
  let controller: CategoriesController;
  const categoriesServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    getImageUrl: jest.fn(),
    remove: jest.fn(),
    updateTranslation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: categoriesServiceMock,
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('stores an uploaded image under the categories prefix', async () => {
    jest.clearAllMocks();
    categoriesServiceMock.getImageUrl.mockResolvedValue(
      '/catalog-categories/category1.webp',
    );
    categoriesServiceMock.updateTranslation.mockResolvedValue({ id: 3 });
    optimizeUploadedImageMock.mockImplementation((file) =>
      Promise.resolve({ ...file, filename: 'stored.webp' }),
    );

    await controller.updateTranslations(
      3,
      { contentLocale: 'ru', name: 'Монопродукты', description: 'Описание' },
      {
        fieldname: 'image',
        filename: 'upload.png',
        mimetype: 'image/png',
        originalname: 'upload.png',
        path: '/tmp/upload.png',
      },
    );

    expect(categoriesServiceMock.updateTranslation).toHaveBeenCalledWith(3, {
      locale: 'ru',
      name: 'Монопродукты',
      description: 'Описание',
      imageUrl: 'categories/stored.webp',
    });
  });

  it('keeps the current image when no file is uploaded', async () => {
    jest.clearAllMocks();
    categoriesServiceMock.updateTranslation.mockResolvedValue({ id: 3 });

    await controller.updateTranslations(3, {
      contentLocale: 'en',
      name: 'Single products',
      description: 'Description',
    });

    expect(categoriesServiceMock.getImageUrl).not.toHaveBeenCalled();
    expect(categoriesServiceMock.updateTranslation).toHaveBeenCalledWith(3, {
      locale: 'en',
      name: 'Single products',
      description: 'Description',
      imageUrl: undefined,
    });
  });

  it('creates a category from the Russian form, image included', async () => {
    jest.clearAllMocks();
    categoriesServiceMock.create.mockResolvedValue({ id: 7 });
    optimizeUploadedImageMock.mockImplementation((file) =>
      Promise.resolve({ ...file, filename: 'stored.webp' }),
    );

    await controller.create(
      { contentLocale: 'ru', name: 'Биопрепараты', description: 'Описание' },
      {
        fieldname: 'image',
        filename: 'upload.png',
        mimetype: 'image/png',
        originalname: 'upload.png',
        path: '/tmp/upload.png',
      },
    );

    expect(categoriesServiceMock.create).toHaveBeenCalledWith({
      locale: 'ru',
      name: 'Биопрепараты',
      description: 'Описание',
      imageUrl: 'categories/stored.webp',
    });
  });

  it('creates a category without an image', async () => {
    jest.clearAllMocks();
    categoriesServiceMock.create.mockResolvedValue({ id: 8 });

    await controller.create({ contentLocale: 'ru', name: 'Биопрепараты' });

    expect(optimizeUploadedImageMock).not.toHaveBeenCalled();
    expect(categoriesServiceMock.create).toHaveBeenCalledWith({
      locale: 'ru',
      name: 'Биопрепараты',
      description: '',
      imageUrl: undefined,
    });
  });

  it('rejects a category without a name', async () => {
    jest.clearAllMocks();

    await expect(
      controller.create({ contentLocale: 'ru', name: '  ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(categoriesServiceMock.create).not.toHaveBeenCalled();
  });

  it('rejects creating a category in a non-Russian locale', async () => {
    jest.clearAllMocks();

    await expect(
      controller.create({ contentLocale: 'en', name: 'Bio products' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(categoriesServiceMock.create).not.toHaveBeenCalled();
  });

  it('returns the deleted category id', async () => {
    jest.clearAllMocks();
    categoriesServiceMock.remove.mockResolvedValue({
      id: 4,
      name: 'Монопродукты',
      imageUrl: '/catalog-categories/category1.webp',
    });

    await expect(controller.remove(4)).resolves.toEqual({ id: 4 });
    expect(categoriesServiceMock.remove).toHaveBeenCalledWith(4);
  });
});
