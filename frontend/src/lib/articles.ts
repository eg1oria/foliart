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
  const localeMap: Record<string, string> = {
    en: 'en-US',
    fr: 'fr-FR',
    ru: 'ru-RU',
    es: 'es-ES',
  };

  const formatter = new Intl.DateTimeFormat(localeMap[locale] ?? 'ru-RU', {
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
      title: 'Useful Articles',
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
        'The body supports formatted text and images between paragraphs.',
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
        'Use the toolbar to format text and insert images at the current cursor position.',
      excerptHint: 'If empty, the excerpt will be generated automatically from the article body.',
      translationHint:
        'Leave the English fields empty if the English site should reuse the Russian version.',
      backToSite: 'Open articles page',
    };
  }

  if (locale === 'fr') {
    return {
      title: 'Articles utiles pour les plantes',
      emptyState:
        "Les articles apparaîtront ici après leur ajout dans le panneau d'administration.",
      readMore: "Lire l'article",
      backToArticles: 'Retour à la liste des articles',
      relatedTitle: 'Autres articles',
      relatedEmpty: 'De nouveaux articles seront publiés prochainement.',
      metadataViewsLabel: 'vues',
      detailsEmpty: "Le contenu de l'article sera ajouté prochainement.",
      adminSectionLabel: 'Articles',
      adminTitle: "Éditeur d'articles",
      adminSubtitle:
        "Créez et mettez à jour les cartes d'articles, les images de couverture, les dates de publication et le contenu formaté.",
      adminFormTitle: 'Ajouter un article',
      adminFormDescription:
        "Le corps de l'article prend en charge le texte formaté et les images entre les paragraphes.",
      adminExistingTitle: 'Articles publiés',
      adminEmptyState: "Aucun article pour l'instant.",
      statusCreated: 'Article ajouté avec succès.',
      statusUpdated: 'Article mis à jour avec succès.',
      titleLabel: "Titre de l'article",
      titleEnLabel: "Titre de l'article en anglais",
      excerptLabel: 'Extrait court',
      excerptEnLabel: 'Extrait en anglais',
      imageLabel: 'Image de couverture',
      contentLabel: "Corps de l'article",
      contentEnLabel: "Corps de l'article en anglais",
      publishedAtLabel: 'Date de publication',
      optionalLabel: 'Facultatif',
      submitLabel: "Ajouter l'article",
      updateLabel: 'Enregistrer les modifications',
      editLabel: "Modifier l'article",
      openArticle: "Ouvrir l'article",
      imageHint: "Formats acceptés : JPG, PNG et WEBP jusqu'à 5 Mo.",
      replaceImageHint: 'Laissez le champ vide pour conserver la couverture actuelle.',
      imagePathLabel: "Chemin de l'image",
      adminPathHint:
        'Utilisez cette section pour maintenir la page des articles à jour rapidement.',
      contentHint:
        "Utilisez la barre d'outils pour mettre en forme le texte et insérer des images à la position du curseur.",
      excerptHint:
        "Si le champ est vide, l'extrait sera généré automatiquement à partir du corps de l'article.",
      translationHint:
        'Laissez les champs anglais vides si la version anglaise du site doit utiliser la version russe.',
      backToSite: 'Ouvrir la section des articles',
    };
  }

  if (locale === 'es') {
    return {
      title: 'Artículos útiles para las plantas',
      emptyState: 'Los artículos aparecerán aquí una vez añadidos en el panel de administración.',
      readMore: 'Leer artículo',
      backToArticles: 'Volver a la lista de artículos',
      relatedTitle: 'Más artículos',
      relatedEmpty: 'Próximamente se publicarán nuevos artículos.',
      metadataViewsLabel: 'vistas',
      detailsEmpty: 'El contenido del artículo se añadirá próximamente.',
      adminSectionLabel: 'Artículos',
      adminTitle: 'Editor de artículos',
      adminSubtitle:
        'Cree y actualice tarjetas de artículos, imágenes de portada, fechas de publicación y contenido con formato.',
      adminFormTitle: 'Añadir artículo',
      adminFormDescription:
        'El cuerpo del artículo admite texto con formato e imágenes entre párrafos.',
      adminExistingTitle: 'Artículos publicados',
      adminEmptyState: 'Aún no hay artículos.',
      statusCreated: 'Artículo creado correctamente.',
      statusUpdated: 'Artículo actualizado correctamente.',
      titleLabel: 'Título del artículo',
      titleEnLabel: 'Título del artículo en español',
      excerptLabel: 'Extracto breve',
      excerptEnLabel: 'Extracto en español',
      imageLabel: 'Imagen de portada',
      contentLabel: 'Cuerpo del artículo',
      contentEnLabel: 'Cuerpo del artículo en español',
      publishedAtLabel: 'Fecha de publicación',
      optionalLabel: 'Opcional',
      submitLabel: 'Añadir artículo',
      updateLabel: 'Guardar cambios',
      editLabel: 'Editar artículo',
      openArticle: 'Abrir artículo',
      imageHint: 'Formatos admitidos: JPG, PNG y WEBP hasta 5 MB.',
      replaceImageHint: 'Deje el campo vacío para conservar la portada actual.',
      imagePathLabel: 'Ruta de la imagen',
      adminPathHint:
        'Use esta sección para mantener la página de artículos actualizada rápidamente.',
      contentHint:
        'Use la barra de herramientas para dar formato e insertar imágenes en la posición del cursor.',
      excerptHint:
        'Si el campo está vacío, el extracto se generará automáticamente a partir del cuerpo del artículo.',
      translationHint:
        'Deje los campos en español vacíos si la versión española del sitio debe usar la versión rusa.',
      backToSite: 'Abrir la sección de artículos',
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
      'В тексте статьи можно использовать форматирование и вставлять фото между абзацами.',
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
      'Поставьте курсор между абзацами и нажмите кнопку с изображением, чтобы вставить фото.',
    excerptHint: 'Если поле пустое, описание сформируется автоматически из текста статьи.',
    translationHint:
      'Оставьте английские поля пустыми, если в английской версии сайта должен использоваться русский текст.',
    backToSite: 'Открыть раздел статей',
  };
}
