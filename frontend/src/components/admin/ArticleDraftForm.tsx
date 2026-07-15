'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ArticleRichTextEditor, {
  type UploadedArticleMedia,
} from './ArticleRichTextEditor';
import {
  EMPTY_ARTICLE_DOCUMENT,
  hasPendingUploads,
  sanitizeArticleDocumentImages,
  type ArticleDocument,
} from '@/lib/articleContent';
import {
  adminFileInputClassName,
  adminHintClassName,
  adminInputClassName,
  adminLabelClassName,
  adminPrimaryButtonClassName,
  adminTextareaClassName,
} from './adminStyles';

type DraftMedia = UploadedArticleMedia & { role: 'COVER' | 'CONTENT' };
type ArticleDraft = {
  id: string;
  articleId: number | null;
  locale: string;
  title: string;
  excerpt: string;
  contentJson: ArticleDocument;
  publishedAt: string;
  coverMediaId: string | null;
  version: number;
  imageLayoutRevision: number;
  updatedAt: string;
  media: DraftMedia[];
};

type LocalDraftSnapshot = {
  title?: string;
  excerpt?: string;
  publishedAt?: string;
  contentJson?: ArticleDocument;
  savedAt?: number;
};

class DraftRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'DraftRequestError';
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as (T & { message?: string | string[] }) | null;
  if (!response.ok || !data) {
    const message = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
    throw new DraftRequestError(message || 'Request failed', response.status);
  }
  return data;
}

export default function ArticleDraftForm({
  articleId,
  contentLocale,
  draftId,
  locale,
}: {
  articleId?: number;
  contentLocale: string;
  draftId?: string;
  locale: string;
}) {
  const router = useRouter();
  const storageKey = useMemo(
    () => `foliart:article-draft:${articleId ?? 'new'}:${contentLocale}`,
    [articleId, contentLocale],
  );
  const [draft, setDraft] = useState<ArticleDraft | null>(null);
  const draftRef = useRef<ArticleDraft | null>(null);
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [publishedAt, setPublishedAt] = useState(new Date().toISOString().slice(0, 10));
  const [cover, setCover] = useState<DraftMedia | null>(null);
  const [editorDocument, setEditorDocument] = useState<ArticleDocument>(EMPTY_ARTICLE_DOCUMENT);
  const documentRef = useRef<ArticleDocument>(EMPTY_ARTICLE_DOCUMENT);
  const imageLayoutRevisionRef = useRef(0);
  const fieldsRef = useRef({ title: '', excerpt: '', publishedAt: '' });
  const dirtyRef = useRef(false);
  const validationErrorRef = useRef(false);
  const localPersistTimerRef = useRef<number | null>(null);
  const savingRef = useRef<Promise<ArticleDraft> | null>(null);
  const publishingRef = useRef(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [status, setStatus] = useState<'loading' | 'saved' | 'saving' | 'error' | 'conflict'>('loading');
  const [message, setMessage] = useState('');

  const applyDraft = useCallback((value: ArticleDraft, restoreLocal = true) => {
    draftRef.current = value;
    setDraft(value);
    let local: LocalDraftSnapshot | null = null;
    if (restoreLocal) {
      try {
        local = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as LocalDraftSnapshot | null;
      } catch {
        local = null;
      }
    }
    const useLocal = Boolean(local?.savedAt && local.savedAt > new Date(value.updatedAt).getTime());
    const nextTitle = useLocal ? local?.title ?? value.title : value.title;
    const nextExcerpt = useLocal ? local?.excerpt ?? value.excerpt : value.excerpt;
    const nextDate = useLocal
      ? local?.publishedAt ?? value.publishedAt.slice(0, 10)
      : value.publishedAt.slice(0, 10);
    const candidateDocument = useLocal ? local?.contentJson ?? value.contentJson : value.contentJson;
    const { document: nextDocument, removedImages } =
      sanitizeArticleDocumentImages(candidateDocument);
    const repairedImages = removedImages > 0;
    setTitle(nextTitle);
    setExcerpt(nextExcerpt);
    setPublishedAt(nextDate);
    documentRef.current = nextDocument;
    imageLayoutRevisionRef.current = value.imageLayoutRevision;
    setEditorDocument(nextDocument);
    fieldsRef.current = { title: nextTitle, excerpt: nextExcerpt, publishedAt: nextDate };
    setCover(value.media.find((item) => item.id === value.coverMediaId) ?? null);
    dirtyRef.current = useLocal || repairedImages;
    validationErrorRef.current = false;
    setStatus(useLocal || repairedImages ? 'error' : 'saved');
    if (repairedImages) {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          title: nextTitle,
          excerpt: nextExcerpt,
          publishedAt: nextDate,
          contentJson: nextDocument,
          savedAt: Date.now(),
        }),
      );
      setMessage(
        locale === 'ru'
          ? `Удалено внешних изображений: ${removedImages}. Загрузите их заново кнопкой изображения.`
          : `Removed external images: ${removedImages}. Upload them again with the image button.`,
      );
    } else if (useLocal) {
      setMessage(
        locale === 'ru'
          ? 'Восстановлена локальная несохранённая версия.'
          : 'Recovered a local unsaved version.',
      );
    }
  }, [locale, storageKey]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rememberedId = draftId ?? localStorage.getItem(`${storageKey}:id`);
        let value: ArticleDraft | null = null;
        if (rememberedId) {
          const response = await fetch(`/admin-api/article-drafts/${rememberedId}`, { cache: 'no-store' });
          if (response.ok) value = await readJson<ArticleDraft>(response);
        }
        if (!value) {
          value = await readJson<ArticleDraft>(
            await fetch('/admin-api/article-drafts', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ articleId, locale: contentLocale }),
            }),
          );
        }
        if (!cancelled) {
          localStorage.setItem(`${storageKey}:id`, value.id);
          applyDraft(value);
        }
      } catch (error) {
        if (!cancelled) {
          setStatus('error');
          setMessage(error instanceof Error ? error.message : 'Could not load draft');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyDraft, articleId, contentLocale, draftId, storageKey]);

  const clearLocalPersistTimer = useCallback(() => {
    if (localPersistTimerRef.current !== null) {
      window.clearTimeout(localPersistTimerRef.current);
      localPersistTimerRef.current = null;
    }
  }, []);

  const persistLocal = useCallback(() => {
    clearLocalPersistTimer();
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        ...fieldsRef.current,
        contentJson: documentRef.current,
        savedAt: Date.now(),
      }),
    );
  }, [clearLocalPersistTimer, storageKey]);

  const scheduleLocalPersist = useCallback(() => {
    clearLocalPersistTimer();
    localPersistTimerRef.current = window.setTimeout(() => {
      localPersistTimerRef.current = null;
      persistLocal();
    }, 400);
  }, [clearLocalPersistTimer, persistLocal]);

  const markDirty = useCallback(() => {
    validationErrorRef.current = false;
    dirtyRef.current = true;
    scheduleLocalPersist();
  }, [scheduleLocalPersist]);

  useEffect(() => {
    return () => {
      clearLocalPersistTimer();
      if (dirtyRef.current) persistLocal();
    };
  }, [clearLocalPersistTimer, persistLocal]);

  const saveNow = useCallback(async (overrideDocument?: ArticleDocument) => {
    if (overrideDocument) {
      documentRef.current = overrideDocument;
      validationErrorRef.current = false;
      dirtyRef.current = true;
      persistLocal();
    }
    let saved = draftRef.current;
    do {
      while (savingRef.current) await savingRef.current;
      const current = draftRef.current;
      if (!current) throw new Error('Draft is not ready');
      saved = current;
      if (!dirtyRef.current) break;
      dirtyRef.current = false;
      setStatus('saving');
      const requestDocument = documentRef.current;
      const requestImageLayoutRevision = imageLayoutRevisionRef.current;
      const request = fetch(`/admin-api/article-drafts/${current.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          version: current.version,
          imageLayoutRevision: requestImageLayoutRevision,
          ...fieldsRef.current,
          contentJson: requestDocument,
          coverMediaId: draftRef.current?.coverMediaId ?? null,
        }),
      }).then((response) => readJson<ArticleDraft>(response));
      savingRef.current = request;
      try {
        saved = await request;
        draftRef.current = saved;
        setDraft(saved);
        if (documentRef.current === requestDocument) {
          documentRef.current = saved.contentJson;
          imageLayoutRevisionRef.current = saved.imageLayoutRevision;
          setEditorDocument(saved.contentJson);
        }
        if (!dirtyRef.current) {
          validationErrorRef.current = false;
          clearLocalPersistTimer();
          localStorage.removeItem(storageKey);
          setStatus('saved');
          setMessage('');
        }
      } catch (error) {
        dirtyRef.current = true;
        const text = error instanceof Error ? error.message : 'Autosave failed';
        validationErrorRef.current =
          error instanceof DraftRequestError &&
          error.status >= 400 &&
          error.status < 500 &&
          ![408, 425, 429].includes(error.status);
        setStatus(
          error instanceof DraftRequestError && error.status === 409 ? 'conflict' : 'error',
        );
        setMessage(text);
        persistLocal();
        throw error;
      } finally {
        savingRef.current = null;
      }
    } while (dirtyRef.current);
    return saved!;
  }, [clearLocalPersistTimer, persistLocal, storageKey]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (dirtyRef.current && !validationErrorRef.current) {
        void saveNow().catch(() => undefined);
      }
    }, 10_000);
    const visibility = () => {
      if (document.visibilityState === 'hidden' && dirtyRef.current) {
        persistLocal();
        if (!validationErrorRef.current) void saveNow().catch(() => undefined);
      }
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        persistLocal();
        event.preventDefault();
      }
    };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [persistLocal, saveNow]);

  const uploadMedia = useCallback(async (
    file: File,
    uploadId: string,
    role: 'COVER' | 'CONTENT',
    expectedDraftId?: string,
  ) => {
    const draftIdForUpload = expectedDraftId ?? draftRef.current?.id;
    if (!draftIdForUpload) throw new Error('Draft is not ready');
    const payload = new FormData();
    payload.append('image', file);
    payload.append('uploadId', uploadId);
    payload.append('role', role);
    return readJson<DraftMedia>(
      await fetch(`/admin-api/article-drafts/${draftIdForUpload}/media`, {
        method: 'POST',
        body: payload,
      }),
    );
  }, []);

  const publish = async () => {
    if (publishingRef.current) return;
    publishingRef.current = true;
    setIsPublishing(true);
    try {
      if (validationErrorRef.current) {
        throw new Error(
          locale === 'ru'
            ? 'Исправьте указанную ошибку черновика перед публикацией.'
            : 'Fix the reported draft error before publishing.',
        );
      }
      if (hasPendingUploads(documentRef.current)) {
        throw new Error(
          locale === 'ru'
            ? 'Завершите или удалите незагруженные изображения.'
            : 'Finish or remove pending images.',
        );
      }
      const saved = await saveNow();
      const article = await readJson<{ id: number }>(
        await fetch(`/admin-api/article-drafts/${saved.id}/publish`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ version: saved.version }),
        }),
      );
      localStorage.removeItem(storageKey);
      localStorage.removeItem(`${storageKey}:id`);
      router.replace(
        `/${locale}/admin/articles?status=updated&article=${article.id}&contentLocale=${contentLocale}`,
      );
      router.refresh();
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Publish failed');
    } finally {
      publishingRef.current = false;
      setIsPublishing(false);
    }
  };

  if (!draft) {
    return <p className="mt-6 text-sm text-[#567068]">{message || (locale === 'ru' ? 'Загрузка черновика…' : 'Loading draft…')}</p>;
  }

  return (
    <div
      className="mt-6 space-y-5"
      onBlur={(event) => {
        if (
          !event.currentTarget.contains(event.relatedTarget) &&
          !validationErrorRef.current
        ) {
          void saveNow().catch(() => undefined);
        }
      }}
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px]">
        <label className="space-y-2">
          <span className={adminLabelClassName}>{locale === 'ru' ? 'Заголовок' : 'Title'}</span>
          <input
            className={adminInputClassName}
            value={title}
            onChange={(event) => {
              const value = event.target.value;
              setTitle(value);
              fieldsRef.current.title = value;
              markDirty();
            }}
            required
          />
        </label>
        <label className="space-y-2">
          <span className={adminLabelClassName}>{locale === 'ru' ? 'Дата публикации' : 'Publication date'}</span>
          <input
            className={adminInputClassName}
            type="date"
            value={publishedAt}
            onChange={(event) => {
              const value = event.target.value;
              setPublishedAt(value);
              fieldsRef.current.publishedAt = value;
              markDirty();
            }}
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className={adminLabelClassName}>{locale === 'ru' ? 'Обложка' : 'Cover image'}</span>
        <input
          className={adminFileInputClassName}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.currentTarget.value = '';
            if (!file) return;
            void (async () => {
              const expectedDraftId = draftRef.current?.id;
              if (!expectedDraftId) return;
              try {
                await saveNow();
                if (draftRef.current?.id !== expectedDraftId) return;
                const media = await uploadMedia(
                  file,
                  crypto.randomUUID(),
                  'COVER',
                  expectedDraftId,
                );
                if (draftRef.current?.id !== expectedDraftId) return;
                setCover(media);
                if (draftRef.current) draftRef.current = { ...draftRef.current, coverMediaId: media.id };
                markDirty();
                await saveNow();
              } catch (error) {
                setStatus('error');
                setMessage(error instanceof Error ? error.message : 'Cover upload failed');
              }
            })();
          }}
        />
        <span className={adminHintClassName}>
          {cover
            ? locale === 'ru'
              ? 'Новая обложка загружена.'
              : 'New cover uploaded.'
            : articleId
              ? locale === 'ru'
                ? 'Оставьте пустым, чтобы сохранить текущую обложку.'
                : 'Leave empty to keep the current cover.'
              : locale === 'ru'
                ? 'Обложка обязательна перед публикацией.'
                : 'A cover is required before publishing.'}
        </span>
      </label>

      <label className="block space-y-2">
        <span className={adminLabelClassName}>{locale === 'ru' ? 'Краткое описание' : 'Excerpt'}</span>
        <textarea
          className={adminTextareaClassName}
          rows={4}
          value={excerpt}
          onChange={(event) => {
            const value = event.target.value;
            setExcerpt(value);
            fieldsRef.current.excerpt = value;
            markDirty();
          }}
        />
      </label>

      <div className="space-y-2">
        <span className={adminLabelClassName}>{locale === 'ru' ? 'Текст статьи' : 'Article content'}</span>
        <ArticleRichTextEditor
          defaultDocument={editorDocument}
          locale={locale}
          placeholder={locale === 'ru' ? 'Начните писать статью…' : 'Start writing the article…'}
          onChange={(document) => {
            documentRef.current = document;
            markDirty();
          }}
          onBeforeUpload={async (document) => {
            await saveNow(document);
          }}
          onUpload={(file, uploadId) => uploadMedia(file, uploadId, 'CONTENT')}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-[#0b5a45]/10 pt-5">
        <button
          type="button"
          className={`${adminPrimaryButtonClassName} disabled:cursor-not-allowed disabled:opacity-60`}
          onClick={() => void publish()}
          disabled={isPublishing}
          aria-busy={isPublishing}
        >
          {isPublishing
            ? locale === 'ru'
              ? 'Публикация…'
              : 'Publishing…'
            : articleId
              ? locale === 'ru'
                ? 'Сохранить и опубликовать'
                : 'Save and publish'
              : locale === 'ru'
                ? 'Опубликовать'
                : 'Publish'}
        </button>
        <p
          role={status === 'error' || status === 'conflict' ? 'alert' : 'status'}
          className={`text-sm ${status === 'error' || status === 'conflict' ? 'text-red-700' : 'text-[#567068]'}`}
        >
          {message ||
            (status === 'saving'
              ? locale === 'ru'
                ? 'Сохраняется…'
                : 'Saving…'
              : locale === 'ru'
                ? 'Черновик сохранён'
                : 'Draft saved')}
        </p>
        {(status === 'error' || status === 'conflict') && (
          <button
            type="button"
            className="text-sm underline"
            onClick={() => {
              validationErrorRef.current = false;
              dirtyRef.current = true;
              void saveNow().catch(() => undefined);
            }}
          >
            {locale === 'ru' ? 'Повторить' : 'Retry'}
          </button>
        )}
      </div>
    </div>
  );
}
