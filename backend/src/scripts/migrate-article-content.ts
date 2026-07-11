import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { randomUUID, createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import sharp from 'sharp';
import {
  sanitizeArticleContent,
  stripHtmlToText,
} from '../articles/article-content.util';
import { normalizeArticleDocument } from '../articles/article-content-json';
import {
  articleHtmlToJson,
  articleJsonToHtml,
} from '../articles/article-tiptap';
import { slugifyArticleTitle } from '../articles/article-slug.util';
import {
  applyArticleImageLayout,
  createArticleImageLayout,
} from '../articles/article-image-layout';

const execFileAsync = promisify(execFile);

type Args = {
  apply: boolean;
  databaseUrl: string;
  mediaDirectory: string;
  reportDirectory: string;
};

function parseArgs(): Args {
  const values = process.argv.slice(2);
  const get = (name: string) => {
    const prefix = `${name}=`;
    return values
      .find((value) => value.startsWith(prefix))
      ?.slice(prefix.length);
  };
  const databaseUrl = get('--database');
  const mediaDirectory = get('--media-dir');
  if (!databaseUrl || !databaseUrl.startsWith('file:')) {
    throw new Error(
      'Pass an explicit SQLite URL with --database=file:/absolute/path.db',
    );
  }
  if (!mediaDirectory)
    throw new Error('Pass --media-dir=/absolute/path/to/images/articles');
  const apply = values.includes('--apply');
  if (!apply && !values.includes('--dry-run'))
    throw new Error('Choose exactly one of --dry-run or --apply');
  return {
    apply,
    databaseUrl,
    mediaDirectory: resolve(mediaDirectory),
    reportDirectory: resolve(
      get('--report-dir') ?? join(process.cwd(), 'migration-reports'),
    ),
  };
}

function databasePath(url: string) {
  return resolve(url.slice('file:'.length));
}

function createClient(url: string) {
  return new PrismaClient({ adapter: new PrismaLibSql({ url }) });
}

function imageUrls(value: string) {
  return [...value.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(
    (match) => match[1],
  );
}

function countNodes(document: { content?: unknown[] }) {
  let count = 0;
  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    count += 1;
    const content = (node as { content?: unknown[] }).content;
    content?.forEach(visit);
  };
  visit(document);
  return count;
}

async function deploySchema(url: string) {
  await execFileAsync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: url },
  });
}

async function registerLegacyMedia(
  prisma: PrismaClient,
  mediaDirectory: string,
  articleId: number,
  publicUrl: string,
  role: 'COVER' | 'CONTENT',
) {
  const existing = await prisma.articleMedia.findUnique({
    where: { publicUrl },
  });
  if (existing) return existing;
  const relative = publicUrl.replace(/^\/media\//, '');
  const filePath = join(
    dirname(mediaDirectory),
    relative.replace(/^articles\//, 'articles/'),
  );
  const safeRoot = dirname(mediaDirectory);
  if (!filePath.startsWith(safeRoot))
    throw new Error(`Unsafe legacy media URL: ${publicUrl}`);
  const stat = await fs.stat(filePath);
  const metadata = await sharp(filePath, {
    animated: true,
    failOn: 'error',
  }).metadata();
  const id = randomUUID();
  const previewPath = `articles/media/${id}/preview.webp`;
  const previewFile = join(dirname(mediaDirectory), previewPath);
  await fs.mkdir(dirname(previewFile), { recursive: true });
  await sharp(filePath, { animated: false, failOn: 'error' })
    .rotate()
    .resize({ width: 640, withoutEnlargement: true })
    .webp({ quality: 78, effort: 4 })
    .toFile(previewFile);
  return prisma.articleMedia.create({
    data: {
      id,
      uploadId: `legacy-${createHash('sha256').update(publicUrl).digest('hex').slice(0, 40)}`,
      role,
      status: 'ATTACHED',
      articleId,
      storagePath: relative,
      previewPath,
      publicUrl,
      previewUrl: `/media/${previewPath}`,
      mimeType:
        metadata.format === 'gif'
          ? 'image/gif'
          : `image/${metadata.format === 'jpeg' ? 'jpeg' : metadata.format}`,
      originalName: basename(relative),
      byteSize: stat.size,
      width: metadata.width ?? 1,
      height: metadata.pageHeight ?? metadata.height ?? 1,
      pages: metadata.pages ?? 1,
    },
  });
}

async function attachMediaIds(
  document: ReturnType<typeof normalizeArticleDocument>,
  resolveMedia: (
    src: string,
  ) => Promise<{ id: string; width: number; height: number }>,
) {
  const visit = async (node: typeof document): Promise<typeof document> => {
    const content = node.content
      ? await Promise.all(node.content.map(visit))
      : undefined;
    if (node.type === 'image' && typeof node.attrs?.src === 'string') {
      const media = await resolveMedia(node.attrs.src);
      return {
        ...node,
        attrs: {
          ...node.attrs,
          mediaId: media.id,
          width: media.width,
          height: media.height,
        },
        ...(content ? { content } : {}),
      };
    }
    return { ...node, ...(content ? { content } : {}) };
  };
  return visit(document);
}

async function main() {
  const args = parseArgs();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const runDirectory = join(args.reportDirectory, timestamp);
  await fs.mkdir(runDirectory, { recursive: true });
  const samplesDirectory = join(runDirectory, 'samples');
  await fs.mkdir(samplesDirectory, { recursive: true });
  const sourcePath = databasePath(args.databaseUrl);
  const targetPath = args.apply ? sourcePath : join(runDirectory, 'dry-run.db');
  const targetUrl = `file:${targetPath}`;

  if (args.apply) {
    await fs.copyFile(sourcePath, join(runDirectory, 'database-before.db'));
    await fs.cp(
      args.mediaDirectory,
      join(runDirectory, 'articles-images-before'),
      { recursive: true },
    );
  } else {
    await fs.copyFile(sourcePath, targetPath);
  }
  await deploySchema(targetUrl);

  const prisma = createClient(targetUrl);
  const report = {
    mode: args.apply ? 'apply' : 'dry-run',
    sourceDatabase: sourcePath,
    workingDatabase: targetPath,
    backupDirectory: args.apply ? runDirectory : null,
    totals: {
      articles: 0,
      translations: 0,
      converted: 0,
      skipped: 0,
      failed: 0,
    },
    errors: [] as Array<{ articleId: number; locale: string; message: string }>,
    samples: [] as Array<Record<string, unknown>>,
    orphanFiles: [] as string[],
    orphanCoverFiles: [] as string[],
  };

  try {
    const articles = await prisma.article.findMany({
      include: { translations: true },
      orderBy: { id: 'asc' },
    });
    report.totals.articles = articles.length;
    report.totals.translations = articles.reduce(
      (sum, item) => sum + item.translations.length,
      0,
    );
    const slugs = new Map<string, number>();
    for (const article of articles) {
      const slug = article.slug ?? slugifyArticleTitle(article.title);
      const collision = slugs.get(slug);
      if (collision && collision !== article.id)
        throw new Error(
          `Slug collision between articles ${collision} and ${article.id}: ${slug}`,
        );
      slugs.set(slug, article.id);
      if (args.apply && !article.slug)
        await prisma.article.update({
          where: { id: article.id },
          data: { slug },
        });

      const coverUrl = `/media/${article.imageUrl.replace(/^\/+/, '')}`;
      if (args.apply && article.imageUrl) {
        try {
          const cover = await registerLegacyMedia(
            prisma,
            args.mediaDirectory,
            article.id,
            coverUrl,
            'COVER',
          );
          await prisma.article.update({
            where: { id: article.id },
            data: { coverMediaId: cover.id },
          });
        } catch (error) {
          report.errors.push({
            articleId: article.id,
            locale: 'cover',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }

      for (const translation of article.translations) {
        if (translation.contentJson) {
          report.totals.skipped += 1;
          continue;
        }
        try {
          const sanitized = sanitizeArticleContent(translation.content);
          let document = normalizeArticleDocument(articleHtmlToJson(sanitized));
          if (args.apply) {
            document = await attachMediaIds(document, (src) =>
              registerLegacyMedia(
                prisma,
                args.mediaDirectory,
                article.id,
                src,
                'CONTENT',
              ),
            );
          }
          const rendered = articleJsonToHtml(document);
          const textEqual =
            stripHtmlToText(sanitized) === stripHtmlToText(rendered);
          const beforeImages = imageUrls(sanitized).sort();
          const afterImages = imageUrls(rendered).sort();
          const imagesEqual =
            JSON.stringify(beforeImages) === JSON.stringify(afterImages);
          if (!textEqual || !imagesEqual)
            throw new Error(
              `Round-trip mismatch (text=${textEqual}, images=${imagesEqual})`,
            );
          if (args.apply) {
            await prisma.articleTranslation.update({
              where: { id: translation.id },
              data: {
                contentJson: document,
                contentSchemaVersion: 1,
              },
            });
          }
          report.totals.converted += 1;
          if ([1, 6, 8].includes(article.id)) {
            const sampleName = `article-${article.id}-${translation.locale}`;
            await Promise.all([
              fs.writeFile(
                join(samplesDirectory, `${sampleName}.before.html`),
                sanitized,
              ),
              fs.writeFile(
                join(samplesDirectory, `${sampleName}.after.html`),
                rendered,
              ),
            ]);
            report.samples.push({
              articleId: article.id,
              locale: translation.locale,
              beforeCharacters: translation.content.length,
              afterNodes: countNodes(document),
              textEqual,
              imagesEqual,
              imageUrls: afterImages,
            });
          }
        } catch (error) {
          report.totals.failed += 1;
          report.errors.push({
            articleId: article.id,
            locale: translation.locale,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (args.apply && !article.imageLayoutJson) {
        const migratedTranslations = await prisma.articleTranslation.findMany({
          where: { articleId: article.id },
          select: { contentJson: true },
          orderBy: { locale: 'asc' },
        });
        const imageLayout = createArticleImageLayout(
          migratedTranslations.map((translation) =>
            translation.contentJson
              ? normalizeArticleDocument(translation.contentJson)
              : null,
          ),
        );
        await prisma.article.update({
          where: { id: article.id },
          data: {
            imageLayoutJson: imageLayout,
            imageLayoutRevision: imageLayout.placements.length ? 1 : 0,
          },
        });

        const imageLayoutRevision = imageLayout.placements.length ? 1 : 0;
        const drafts = await prisma.articleDraft.findMany({
          where: { articleId: article.id },
          select: { id: true, contentJson: true },
        });
        for (const draft of drafts) {
          await prisma.articleDraft.update({
            where: { id: draft.id },
            data: {
              contentJson: applyArticleImageLayout(
                normalizeArticleDocument(draft.contentJson),
                imageLayout,
              ),
              imageLayoutRevision,
              version: { increment: 1 },
            },
          });
        }
      }
    }

    const allContent = articles
      .flatMap((article) => article.translations.map((item) => item.content))
      .join('\n');
    const referenced = new Set(
      imageUrls(allContent).map((url) => basename(url)),
    );
    const contentDirectory = join(args.mediaDirectory, 'content');
    const stored = await fs
      .readdir(contentDirectory)
      .catch(() => [] as string[]);
    report.orphanFiles = stored.filter((name) => !referenced.has(name)).sort();
    const referencedCovers = new Set(
      articles.map((article) => basename(article.imageUrl)),
    );
    const coverEntries = await fs.readdir(args.mediaDirectory, {
      withFileTypes: true,
    });
    report.orphanCoverFiles = coverEntries
      .filter((entry) => entry.isFile() && !referencedCovers.has(entry.name))
      .map((entry) => entry.name)
      .sort();
    await fs.writeFile(
      join(runDirectory, 'report.json'),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    await fs.writeFile(
      join(runDirectory, 'errors.csv'),
      [
        'articleId,locale,message',
        ...report.errors.map(
          (item) =>
            `${item.articleId},${item.locale},${JSON.stringify(item.message)}`,
        ),
      ].join('\n'),
    );
    console.log(
      JSON.stringify(
        {
          report: join(runDirectory, 'report.json'),
          ...report.totals,
          orphans: report.orphanFiles.length,
          orphanCovers: report.orphanCoverFiles.length,
        },
        null,
        2,
      ),
    );
    if (report.totals.failed) process.exitCode = 2;
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error(
    'Article migration failed:',
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
