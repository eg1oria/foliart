import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

function createPrisma(url: string) {
  const adapter = new PrismaLibSql({ url });
  return new PrismaClient({ adapter });
}

function withoutId<T extends { id: number }>(record: T) {
  const { id: _id, ...data } = record;
  return data;
}

async function main() {
  const targetUrl = process.env.DATABASE_URL ?? 'file:./dev.db';
  const bundledSnapshotUrl = process.env.SEED_DATABASE_URL ?? 'file:./dev.db';
  const bundledSnapshotPath = resolve(process.cwd(), 'dev.db');
  const target = createPrisma(targetUrl);

  try {
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
      const [
        categories,
        categoryTranslations,
        products,
        productTranslations,
        articles,
        articleTranslations,
        calendarEntries,
        calendarEntryTranslations,
      ] = await Promise.all([
        source.category.findMany({ orderBy: { id: 'asc' } }),
        source.categoryTranslation.findMany({ orderBy: { id: 'asc' } }),
        source.product.findMany({ orderBy: { id: 'asc' } }),
        source.productTranslation.findMany({ orderBy: { id: 'asc' } }),
        source.article.findMany({ orderBy: { id: 'asc' } }),
        source.articleTranslation.findMany({ orderBy: { id: 'asc' } }),
        source.calendarEntry.findMany({ orderBy: { id: 'asc' } }),
        source.calendarEntryTranslation.findMany({ orderBy: { id: 'asc' } }),
      ]);

      const snapshotRows =
        categories.length +
        categoryTranslations.length +
        products.length +
        productTranslations.length +
        articles.length +
        articleTranslations.length +
        calendarEntries.length +
        calendarEntryTranslations.length;

      if (snapshotRows === 0) {
        console.log('Skip seed: bundled snapshot database is empty.');
        return;
      }

      const created = {
        categories: 0,
        categoryTranslations: 0,
        products: 0,
        productTranslations: 0,
        articles: 0,
        articleTranslations: 0,
        calendarEntries: 0,
        calendarEntryTranslations: 0,
      };

      for (const category of categories) {
        const exists = await target.category.findUnique({
          where: { id: category.id },
          select: { id: true },
        });

        if (!exists) {
          await target.category.create({ data: category });
          created.categories += 1;
        }
      }

      for (const product of products) {
        const exists = await target.product.findUnique({
          where: { id: product.id },
          select: { id: true },
        });

        if (!exists) {
          await target.product.create({ data: product });
          created.products += 1;
        }
      }

      for (const article of articles) {
        const exists = await target.article.findUnique({
          where: { id: article.id },
          select: { id: true },
        });

        if (!exists) {
          await target.article.create({
            data: {
              ...article,
              imageLayoutJson:
                article.imageLayoutJson === null
                  ? Prisma.DbNull
                  : article.imageLayoutJson,
            },
          });
          created.articles += 1;
        }
      }

      for (const entry of calendarEntries) {
        const exists = await target.calendarEntry.findUnique({
          where: { id: entry.id },
          select: { id: true },
        });

        if (!exists) {
          await target.calendarEntry.create({ data: entry });
          created.calendarEntries += 1;
        }
      }

      for (const translation of categoryTranslations) {
        const exists = await target.categoryTranslation.findUnique({
          where: {
            categoryId_locale: {
              categoryId: translation.categoryId,
              locale: translation.locale,
            },
          },
          select: { id: true },
        });

        if (!exists) {
          await target.categoryTranslation.create({
            data: withoutId(translation),
          });
          created.categoryTranslations += 1;
        }
      }

      for (const translation of productTranslations) {
        const exists = await target.productTranslation.findUnique({
          where: {
            productId_locale: {
              productId: translation.productId,
              locale: translation.locale,
            },
          },
          select: { id: true },
        });

        if (!exists) {
          await target.productTranslation.create({
            data: withoutId(translation),
          });
          created.productTranslations += 1;
        }
      }

      for (const translation of articleTranslations) {
        const exists = await target.articleTranslation.findUnique({
          where: {
            articleId_locale: {
              articleId: translation.articleId,
              locale: translation.locale,
            },
          },
          select: { id: true },
        });

        if (!exists) {
          await target.articleTranslation.create({
            data: {
              ...withoutId(translation),
              contentJson:
                translation.contentJson === null
                  ? Prisma.DbNull
                  : translation.contentJson,
            },
          });
          created.articleTranslations += 1;
        }
      }

      for (const translation of calendarEntryTranslations) {
        const exists = await target.calendarEntryTranslation.findUnique({
          where: {
            calendarEntryId_locale: {
              calendarEntryId: translation.calendarEntryId,
              locale: translation.locale,
            },
          },
          select: { id: true },
        });

        if (!exists) {
          await target.calendarEntryTranslation.create({
            data: withoutId(translation),
          });
          created.calendarEntryTranslations += 1;
        }
      }

      console.log(
        [
          'Seeded missing content from bundled snapshot:',
          `${created.categories}/${categories.length} categories`,
          `${created.categoryTranslations}/${categoryTranslations.length} category translations`,
          `${created.products}/${products.length} products`,
          `${created.productTranslations}/${productTranslations.length} product translations`,
          `${created.articles}/${articles.length} articles`,
          `${created.articleTranslations}/${articleTranslations.length} article translations`,
          `${created.calendarEntries}/${calendarEntries.length} calendar entries`,
          `${created.calendarEntryTranslations}/${calendarEntryTranslations.length} calendar entry translations`,
        ].join(' '),
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
