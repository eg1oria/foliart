import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

function createPrisma(url: string) {
  const adapter = new PrismaLibSql({ url });
  return new PrismaClient({ adapter });
}

async function main() {
  const targetUrl = process.env.DATABASE_URL ?? 'file:./dev.db';
  const bundledSnapshotUrl = process.env.SEED_DATABASE_URL ?? 'file:./dev.db';
  const bundledSnapshotPath = resolve(process.cwd(), 'dev.db');
  const target = createPrisma(targetUrl);

  try {
    const [categoryCount, productCount] = await Promise.all([
      target.category.count(),
      target.product.count(),
    ]);

    if (categoryCount > 0 || productCount > 0) {
      console.log(
        `Skip seed: target database already has ${categoryCount} categories and ${productCount} products.`,
      );
      return;
    }

    if (!existsSync(bundledSnapshotPath)) {
      console.log(
        `Skip seed: bundled snapshot database was not found at ${bundledSnapshotPath}.`,
      );
      return;
    }

    if (targetUrl === bundledSnapshotUrl) {
      console.log(
        'Skip seed: target database points to the bundled snapshot itself.',
      );
      return;
    }

    const source = createPrisma(bundledSnapshotUrl);

    try {
      const [categories, products] = await Promise.all([
        source.category.findMany({ orderBy: { id: 'asc' } }),
        source.product.findMany({ orderBy: { id: 'asc' } }),
      ]);

      if (categories.length === 0 && products.length === 0) {
        console.log('Skip seed: bundled snapshot database is empty.');
        return;
      }

      for (const category of categories) {
        await target.category.upsert({
          where: { id: category.id },
          update: category,
          create: category,
        });
        await target.categoryTranslation.upsert({
          where: {
            categoryId_locale: {
              categoryId: category.id,
              locale: 'ru',
            },
          },
          update: {
            name: category.name,
            description: category.description,
          },
          create: {
            categoryId: category.id,
            locale: 'ru',
            name: category.name,
            description: category.description,
          },
        });
        await target.categoryTranslation.upsert({
          where: {
            categoryId_locale: {
              categoryId: category.id,
              locale: 'en',
            },
          },
          update: {
            name: category.nameEn,
            description: category.descriptionEn,
          },
          create: {
            categoryId: category.id,
            locale: 'en',
            name: category.nameEn,
            description: category.descriptionEn,
          },
        });
      }

      for (const product of products) {
        await target.product.upsert({
          where: { id: product.id },
          update: product,
          create: product,
        });
        await target.productTranslation.upsert({
          where: {
            productId_locale: {
              productId: product.id,
              locale: 'ru',
            },
          },
          update: {
            name: product.name,
            description: product.description,
            advantages: product.advantages,
            composition: product.composition,
            application: product.application,
          },
          create: {
            productId: product.id,
            locale: 'ru',
            name: product.name,
            description: product.description,
            advantages: product.advantages,
            composition: product.composition,
            application: product.application,
          },
        });
        await target.productTranslation.upsert({
          where: {
            productId_locale: {
              productId: product.id,
              locale: 'en',
            },
          },
          update: {
            name: product.nameEn,
            description: product.descriptionEn,
            advantages: product.advantagesEn,
            composition: product.compositionEn,
            application: product.applicationEn,
          },
          create: {
            productId: product.id,
            locale: 'en',
            name: product.nameEn,
            description: product.descriptionEn,
            advantages: product.advantagesEn,
            composition: product.compositionEn,
            application: product.applicationEn,
          },
        });
      }

      console.log(
        `Seeded ${categories.length} categories and ${products.length} products from bundled snapshot.`,
      );
    } finally {
      await source.$disconnect();
    }
  } finally {
    await target.$disconnect();
  }
}

main().catch((error) => {
  console.error('Seeding failed.', error);
  process.exitCode = 1;
});
