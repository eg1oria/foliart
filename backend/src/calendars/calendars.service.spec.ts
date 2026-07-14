import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CalendarsService } from './calendars.service';

describe('CalendarsService', () => {
  let service: CalendarsService;
  const calendarEntryMock = {
    create: jest.fn(),
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
});
