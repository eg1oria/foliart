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
    findAll: jest.fn(),
    findOne: jest.fn(),
    getImageUrl: jest.fn(),
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
});
