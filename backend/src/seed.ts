import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? 'file:./dev.db',
});
const prisma = new PrismaClient({ adapter });

const categories = [
  {
    id: 1,
    name: 'Фитомодуляторы и органо-минеральные комплексы',
    description:
      '«Скорая помощь - зеленая реанимация» для устранения хлорозов и восстановления фотосинтеза ослабленных растений.',
    imageUrl: '/catalog-categories/1.jpeg',
    productCount: 10,
  },
  {
    id: 2,
    name: 'Монопродукты',
    description:
      'Точечные препараты для решения конкретных агрономических задач.',
    imageUrl: '/catalog-categories/2.jpeg',
    productCount: 7,
  },
  {
    id: 3,
    name: 'Комплексные препараты',
    description: 'Комбинированные составы с комплексным действием на растение.',
    imageUrl: '/catalog-categories/3.png',
    productCount: 5,
  },
  {
    id: 4,
    name: 'Вспомогательные компоненты',
    description: 'Гели и буферы для растений',
    imageUrl: '/catalog-categories/4.png',
    productCount: 2,
  },
] as const;

async function main() {
  await Promise.all(
    categories.map((category) =>
      prisma.category.upsert({
        where: { id: category.id },
        update: {
          name: category.name,
          description: category.description,
          imageUrl: category.imageUrl,
          productCount: category.productCount,
        },
        create: category,
      }),
    ),
  );
}

main()
  .then(() => console.log(`Seeded ${categories.length} categories`))
  .finally(() => prisma.$disconnect());
