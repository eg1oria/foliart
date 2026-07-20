import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CalendarsService } from './calendars.service';

describe('CalendarsService', () => {
  let service: CalendarsService;
  const calendarEntryMock = {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarsService,
        {
          provide: PrismaService,
          useValue: { calendarEntry: calendarEntryMock },
        },
      ],
    }).compile();

    service = module.get(CalendarsService);
  });

  it('assigns an available suffixed slug when creating an entry', async () => {
    calendarEntryMock.findFirst
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce(null);
    calendarEntryMock.create.mockResolvedValue({
      id: 2,
      slug: 'kukuruza-2',
    });

    await service.create({
      contentLocale: 'ru',
      title: 'Кукуруза',
      description: 'Описание',
      imageUrl1: 'calendars/1.webp',
      imageUrl2: 'calendars/2.webp',
      imageUrl3: '',
      imageUrl4: '',
    });

    type CalendarCreateCall = { data: { slug: string } };
    const createCalls = calendarEntryMock.create.mock.calls as unknown as Array<
      [CalendarCreateCall]
    >;
    expect(createCalls[0]?.[0].data.slug).toBe('kukuruza-2');
  });

  it('keeps the persisted slug when the title is translated or renamed', async () => {
    calendarEntryMock.findUnique.mockResolvedValue({
      id: 1,
      slug: 'kukuruza',
    });
    calendarEntryMock.update.mockResolvedValue({
      id: 1,
      slug: 'kukuruza',
    });

    await service.update({
      id: 1,
      contentLocale: 'ru',
      title: 'Кукуруза сахарная',
      description: 'Новое описание',
    });

    type CalendarUpdateCall = { data: { slug?: string } };
    const updateCalls = calendarEntryMock.update.mock.calls as unknown as Array<
      [CalendarUpdateCall]
    >;
    expect(updateCalls[0]?.[0].data.slug).toBeUndefined();
  });

  it('returns the localized large showcase image when a translation has one', async () => {
    calendarEntryMock.findMany.mockResolvedValue([
      {
        id: 1,
        slug: 'kukuruza',
        title: 'Кукуруза',
        titleEn: 'Corn',
        description: 'Описание',
        descriptionEn: 'Description',
        imageUrl1: 'calendars/1.webp',
        imageUrl2: 'calendars/2.webp',
        imageUrl3: 'calendars/ru-showcase.webp',
        imageUrl4: 'calendars/4.webp',
        translations: [
          {
            locale: 'en',
            title: 'Corn',
            description: 'Description',
            imageUrl3: 'calendars/en-showcase.webp',
          },
        ],
      },
    ]);

    const entries = await service.findAll('en');

    expect(entries[0]?.imageUrl3).toBe('calendars/en-showcase.webp');
    expect(entries[0]?.imageUrls).toEqual([
      'calendars/1.webp',
      'calendars/2.webp',
      'calendars/en-showcase.webp',
      'calendars/4.webp',
    ]);
  });

  it('stores a translated showcase image without replacing the base image', async () => {
    calendarEntryMock.findUnique.mockResolvedValue({
      id: 1,
      slug: 'kukuruza',
    });
    calendarEntryMock.update.mockResolvedValue({
      id: 1,
      slug: 'kukuruza',
    });

    await service.update({
      id: 1,
      contentLocale: 'en',
      title: 'Corn',
      description: 'Description',
      imageUrl3: 'calendars/en-showcase.webp',
    });

    type CalendarUpdateCall = {
      data: {
        imageUrl3?: string;
        translations: {
          upsert: {
            update: { imageUrl3?: string };
            create: { imageUrl3: string };
          };
        };
      };
    };
    const updateCalls = calendarEntryMock.update.mock.calls as unknown as Array<
      [CalendarUpdateCall]
    >;
    const updateData = updateCalls[0]?.[0].data;

    expect(updateData.imageUrl3).toBeUndefined();
    expect(updateData.translations.upsert.update.imageUrl3).toBe(
      'calendars/en-showcase.webp',
    );
    expect(updateData.translations.upsert.create.imageUrl3).toBe(
      'calendars/en-showcase.webp',
    );
  });
});
