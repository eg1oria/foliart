import type { Article } from './api';
import { parseEntityId, slugify } from './catalog';

export function getArticleSlug(article: Pick<Article, 'title' | 'slugSourceTitle'>) {
  return slugify(article.slugSourceTitle?.trim() || article.title);
}

export function getArticleHref(article: Pick<Article, 'title' | 'slugSourceTitle'>) {
  return `/articles/${getArticleSlug(article)}`;
}

export function findArticleByParam(articles: Article[], value: string) {
  const parsedId = parseEntityId(value);

  if (parsedId) {
    return articles.find((article) => article.id === parsedId) ?? null;
  }

  const slug = slugify(value);

  return (
    articles.find(
      (article) =>
        slug === slugify(article.slugSourceTitle?.trim() || article.title) ||
        slug === slugify(article.title),
    ) ?? null
  );
}

export function formatArticleDate(value: string, locale: string) {
  const formatter = new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return formatter.format(new Date(value));
}

export function toDateInputValue(value?: string) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
}

export function getArticlesCopy(locale: string) {
  if (locale === 'en') {
    return {
      title: 'Useful Articles for Plants',
      emptyState: 'Articles will appear here after they are added in the admin panel.',
      readMore: 'Read article',
      backToArticles: 'Back to article list',
      relatedTitle: 'More articles',
      relatedEmpty: 'More articles will be published soon.',
      metadataViewsLabel: 'views',
      detailsEmpty: 'The article content will be added soon.',
      adminSectionLabel: 'Articles',
      adminTitle: 'Article editor',
      adminSubtitle:
        'Create and update article cards, cover images, publication dates, and rich text content.',
      adminFormTitle: 'Add article',
      adminFormDescription:
        'The body supports formatted text: headings, lists, quotes, links, and emphasis.',
      adminExistingTitle: 'Published articles',
      adminEmptyState: 'There are no articles yet.',
      statusCreated: 'Article created successfully.',
      statusUpdated: 'Article updated successfully.',
      titleLabel: 'Article title',
      titleEnLabel: 'Article title in English',
      excerptLabel: 'Short excerpt',
      excerptEnLabel: 'Excerpt in English',
      imageLabel: 'Cover image',
      contentLabel: 'Article body',
      contentEnLabel: 'Article body in English',
      publishedAtLabel: 'Publication date',
      optionalLabel: 'Optional',
      submitLabel: 'Add article',
      updateLabel: 'Save changes',
      editLabel: 'Edit article',
      openArticle: 'Open article',
      imageHint: 'Supported formats: JPG, PNG, WEBP up to 5 MB.',
      replaceImageHint: 'Leave empty to keep the current cover.',
      imagePathLabel: 'Image path',
      adminPathHint: 'Use this section to keep the articles page updated quickly.',
      contentHint:
        'Use the toolbar to format the text. Links will open in a new tab if they point to an external site.',
      excerptHint: 'If empty, the excerpt will be generated automatically from the article body.',
      translationHint:
        'Leave the English fields empty if the English site should reuse the Russian version.',
      backToSite: 'Open articles page',
    };
  }

  return {
    title: 'Полезные статьи для растений',
    emptyState: 'Статьи появятся здесь после добавления в админке.',
    readMore: 'Читать статью',
    backToArticles: 'К списку статей раздела',
    relatedTitle: 'Другие статьи',
    relatedEmpty: 'Скоро здесь появятся новые материалы.',
    metadataViewsLabel: 'просмотров',
    detailsEmpty: 'Содержимое статьи будет добавлено позже.',
    adminSectionLabel: 'Статьи',
    adminTitle: 'Редактор статей',
    adminSubtitle:
      'Добавляйте и обновляйте карточки статей, обложки, даты публикации и форматированный текст.',
    adminFormTitle: 'Добавить статью',
    adminFormDescription:
      'Тело статьи поддерживает форматирование: заголовки, списки, цитаты, ссылки и акценты.',
    adminExistingTitle: 'Опубликованные статьи',
    adminEmptyState: 'Статей пока нет.',
    statusCreated: 'Статья успешно добавлена.',
    statusUpdated: 'Статья успешно обновлена.',
    titleLabel: 'Заголовок статьи',
    titleEnLabel: 'Заголовок на английском',
    excerptLabel: 'Краткое описание',
    excerptEnLabel: 'Краткое описание на английском',
    imageLabel: 'Обложка',
    contentLabel: 'Текст статьи',
    contentEnLabel: 'Текст статьи на английском',
    publishedAtLabel: 'Дата публикации',
    optionalLabel: 'Необязательно',
    submitLabel: 'Добавить статью',
    updateLabel: 'Сохранить изменения',
    editLabel: 'Редактировать статью',
    openArticle: 'Открыть статью',
    imageHint: 'Поддерживаются JPG, PNG и WEBP до 5 МБ.',
    replaceImageHint: 'Оставьте поле пустым, чтобы сохранить текущую обложку.',
    imagePathLabel: 'Путь к изображению',
    adminPathHint:
      'Используйте этот раздел, чтобы быстро поддерживать раздел статей в актуальном состоянии.',
    contentHint:
      'Используйте панель форматирования для заголовков, списков, цитат, ссылок и выделения текста.',
    excerptHint: 'Если поле пустое, описание сформируется автоматически из текста статьи.',
    translationHint:
      'Оставьте английские поля пустыми, если в английской версии сайта должен использоваться русский текст.',
    backToSite: 'Открыть раздел статей',
  };
}
