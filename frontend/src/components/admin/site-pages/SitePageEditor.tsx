'use client';

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { FiCopy, FiEye, FiImage, FiSave } from 'react-icons/fi';

import {
  saveSitePageTranslationAction,
  type SitePageActionState,
} from '../../../app/[locale]/admin/site-pages/actions';
import { getContentLocaleLabel, type ContentLocale } from '@/lib/contentLocales';
import {
  maxSitePageHtmlBytes,
  maxSitePageTitleLength,
  recommendedSitePageDescriptionLength,
  type SitePageImage,
  type SitePageTranslation,
} from '@/lib/sitePages';

import {
  adminCx,
  adminDetailsClassName,
  adminFieldClassName,
  adminHintClassName,
  adminInputClassName,
  adminLabelClassName,
  adminOptionalLabelClassName,
  adminPrimaryButtonClassName,
  adminSecondaryButtonClassName,
  adminSummaryClassName,
  adminTextareaClassName,
} from '../adminStyles';
import SitePageImagesPanel from './SitePageImagesPanel';
import SitePagePreview, { type SitePagePreviewHandle } from './SitePagePreview';

const initialState: SitePageActionState = { status: 'idle' };
const indent = '  ';
const leaveMessage = 'Есть несохранённые изменения. Уйти без сохранения?';

type SavedSnapshot = Pick<SitePageTranslation, 'title' | 'description' | 'html' | 'published'>;

function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(2)} МБ`
    : `${(bytes / 1024).toFixed(1)} КБ`;
}

// `insertText` goes through the browser's own editing pipeline, so the change
// lands in the textarea's undo history and fires a regular `input` event.
function insertIntoTextarea(textarea: HTMLTextAreaElement, text: string) {
  textarea.focus();

  if (!document.execCommand('insertText', false, text)) {
    textarea.setRangeText(text, textarea.selectionStart, textarea.selectionEnd, 'end');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function FieldError({ error }: { error?: string }) {
  return error ? (
    <span className="text-xs font-medium leading-5 text-red-700">{error}</span>
  ) : null;
}

export default function SitePageEditor({
  canManage,
  contentLocale,
  images,
  locale,
  pageId,
  slug,
  sourceTranslation,
  translation,
}: {
  canManage: boolean;
  contentLocale: ContentLocale;
  images: SitePageImage[];
  locale: string;
  pageId: number;
  slug: string;
  /** The Russian version, offered as a starting point for a translation. */
  sourceTranslation: SitePageTranslation | null;
  translation: SitePageTranslation | null;
}) {
  const [saved, setSaved] = useState<SavedSnapshot>(() => ({
    title: translation?.title ?? '',
    description: translation?.description ?? '',
    html: translation?.html ?? '',
    published: translation?.published ?? false,
  }));
  const [state, formAction, pending] = useActionState(
    async (previousState: SitePageActionState, formData: FormData) => {
      const result = await saveSitePageTranslationAction(previousState, formData);

      // What was just sent is what the site has now; the form is clean again.
      if (result.status === 'success') {
        setSaved({
          title: String(formData.get('title') ?? ''),
          description: String(formData.get('description') ?? ''),
          html: String(formData.get('html') ?? ''),
          published: formData.get('published') === 'on',
        });
      }

      return result;
    },
    initialState,
  );
  const [title, setTitle] = useState(saved.title);
  const [description, setDescription] = useState(saved.description);
  const [html, setHtml] = useState(saved.html);
  const [published, setPublished] = useState(saved.published);
  const [wrap, setWrap] = useState(true);
  const dirty =
    title !== saved.title ||
    description !== saved.description ||
    html !== saved.html ||
    published !== saved.published;
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<SitePagePreviewHandle>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  // Esc releases Tab back to focus navigation, so the field is never a trap.
  const tabReleasedRef = useRef(false);
  const cursorPlacedRef = useRef(false);
  const fieldErrors = state.fieldErrors ?? {};
  const htmlBytes = new TextEncoder().encode(html).length;
  const languageLabel = getContentLocaleLabel(contentLocale);
  const canCopySource =
    canManage && contentLocale !== 'ru' && Boolean(sourceTranslation?.html.trim());

  const showPreview = useCallback(() => {
    previewRef.current?.show({ html, locale: contentLocale, title });
  }, [contentLocale, html, title]);

  useEffect(() => {
    if (state.status !== 'idle') {
      messageRef.current?.focus();
    }
  }, [state]);

  // The stored version is shown right away when the editor opens.
  useEffect(() => {
    if (translation?.html.trim()) {
      previewRef.current?.show({
        html: translation.html,
        locale: contentLocale,
        title: translation.title,
      });
    }
  }, [contentLocale, translation?.html, translation?.title]);

  useEffect(() => {
    if (!dirty) return;

    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    // Covers the admin's own links too — the language switcher included.
    const guardLinks = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!target || target.getAttribute('target') === '_blank' || window.confirm(leaveMessage)) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', guardLinks, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', guardLinks, true);
    };
  }, [dirty]);

  function onHtmlKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Escape') {
      tabReleasedRef.current = true;
      return;
    }

    if (event.key === 'Tab' && !event.shiftKey && !tabReleasedRef.current && !event.currentTarget.readOnly) {
      event.preventDefault();
      insertIntoTextarea(event.currentTarget, indent);
      return;
    }

    tabReleasedRef.current = false;
  }

  // Goes through React state rather than the browser's editing commands: the
  // button that triggers it holds the focus, not the textarea.
  function insertSnippet(snippet: string) {
    const textarea = textareaRef.current;
    if (!textarea || !canManage) return;

    const value = textarea.value;
    let position = textarea.selectionEnd;

    // Until the admin has put the cursor somewhere, the caret sits at 0 —
    // before the doctype. Aim for the end of the body instead.
    if (!cursorPlacedRef.current) {
      const bodyClose = value.search(/<\/body\s*>(?![\s\S]*<\/body\s*>)/i);
      position = bodyClose === -1 ? value.length : bodyClose;
    }

    const text = `${snippet}\n`;
    const caret = position + text.length;
    setHtml(value.slice(0, position) + text + value.slice(position));
    cursorPlacedRef.current = true;

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(caret, caret);
    });
  }

  function copySource() {
    if (!sourceTranslation) return;
    if (html.trim() && !window.confirm(`Заменить HTML версии ${languageLabel} на HTML русской версии?`)) {
      return;
    }

    setHtml(sourceTranslation.html);
  }

  return (
    <div className="space-y-6">
      <form
        ref={formRef}
        action={formAction}
        className="space-y-5"
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
            event.preventDefault();
            if (canManage && !pending) formRef.current?.requestSubmit();
          }
        }}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="pageId" value={pageId} />
        <input type="hidden" name="contentLocale" value={contentLocale} />

        {state.status !== 'idle' && state.message ? (
          <div
            ref={messageRef}
            tabIndex={-1}
            role={state.status === 'error' ? 'alert' : 'status'}
            className={adminCx(
              'rounded-lg border px-4 py-3 text-sm outline-none',
              state.status === 'error'
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800',
            )}>
            {state.message}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <label className={adminFieldClassName}>
            <span className={adminLabelClassName}>Заголовок страницы</span>
            <input
              type="text"
              name="title"
              value={title}
              maxLength={maxSitePageTitleLength}
              readOnly={!canManage}
              onChange={(event) => {
                setTitle(event.target.value);
              }}
              placeholder="Весенняя акция на удобрения"
              aria-invalid={Boolean(fieldErrors.title)}
              className={adminInputClassName}
            />
            <FieldError error={fieldErrors.title} />
            <span className={adminHintClassName}>
              Вкладка браузера, поисковики и крупный заголовок над страницей в режиме «Внутри
              сайта».
            </span>
          </label>

          <label className={adminFieldClassName}>
            <span className={adminLabelClassName}>
              Описание для поисковиков{' '}
              <span className={adminOptionalLabelClassName}>— необязательно</span>
            </span>
            <textarea
              name="description"
              rows={3}
              value={description}
              readOnly={!canManage}
              onChange={(event) => {
                setDescription(event.target.value);
              }}
              placeholder="Пара предложений о том, что на странице"
              aria-invalid={Boolean(fieldErrors.description)}
              className={adminTextareaClassName}
            />
            <FieldError error={fieldErrors.description} />
            <span
              className={adminCx(
                adminHintClassName,
                description.length > recommendedSitePageDescriptionLength && 'text-amber-700',
              )}>
              {description.length} / {recommendedSitePageDescriptionLength} — длиннее поисковики
              обрежут.
            </span>
          </label>
        </div>

        <div className={adminFieldClassName}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <label htmlFor="site-page-html" className={adminLabelClassName}>
              HTML страницы · {languageLabel}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {canCopySource ? (
                <button
                  type="button"
                  onClick={copySource}
                  className={adminCx(adminSecondaryButtonClassName, 'h-8 min-h-8 gap-1.5 px-2.5 text-xs')}>
                  <FiCopy aria-hidden="true" />
                  Взять HTML из RU
                </button>
              ) : null}
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#567068]">
                <input
                  type="checkbox"
                  checked={wrap}
                  onChange={(event) => setWrap(event.target.checked)}
                  className="h-4 w-4 accent-[#0b5a45]"
                />
                Перенос строк
              </label>
            </div>
          </div>
          <textarea
            ref={textareaRef}
            id="site-page-html"
            name="html"
            value={html}
            readOnly={!canManage}
            onChange={(event) => {
              setHtml(event.target.value);
            }}
            onKeyDown={onHtmlKeyDown}
            onSelect={() => {
              cursorPlacedRef.current = true;
            }}
            wrap={wrap ? 'soft' : 'off'}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            placeholder={'<!doctype html>\n<html>\n  <head>…</head>\n  <body>…</body>\n</html>\n\nили просто фрагмент: <section>…</section>'}
            aria-invalid={Boolean(fieldErrors.html)}
            aria-describedby="site-page-html-hint"
            className={adminCx(
              adminTextareaClassName,
              'min-h-[60vh] bg-[#fbfbf8] font-mono text-[13px] leading-5 [tab-size:2]',
              !wrap && 'whitespace-pre',
            )}
          />
          <FieldError error={fieldErrors.html} />
          <div
            id="site-page-html-hint"
            className={adminCx('flex flex-wrap justify-between gap-2', adminHintClassName)}>
            <span>
              Целая страница (&lt;html&gt;…) или фрагмент. Работают свои стили, скрипты и
              подключения с CDN — страница открывается в изолированной «песочнице». Tab — отступ,
              Esc затем Tab — выйти из поля, Ctrl/⌘+S — сохранить.
            </span>
            <span className={adminCx(htmlBytes > maxSitePageHtmlBytes && 'font-semibold text-red-700')}>
              {formatBytes(htmlBytes)} из 2 МБ
            </span>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#0b5a45]/10 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5 lg:-mx-6 lg:px-6">
          <label className="inline-flex cursor-pointer items-center gap-2.5 whitespace-nowrap text-sm font-semibold text-[#0b3e31]">
            <input
              type="checkbox"
              name="published"
              checked={published}
              disabled={!canManage}
              onChange={(event) => {
                setPublished(event.target.checked);
              }}
              className="h-4.5 w-4.5 accent-[#0b5a45]"
            />
            Опубликовать версию {languageLabel}
            <span
              className={adminCx(
                'rounded-md px-2 py-0.5 text-[11px] font-semibold',
                saved.published ? 'bg-emerald-100 text-emerald-800' : 'bg-[#eef1ee] text-[#6a7f76]',
              )}>
              {saved.published ? 'сейчас на сайте' : translation ? 'черновик' : 'ещё не сохранена'}
            </span>
          </label>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {dirty ? <span className="text-xs font-medium text-amber-700">Есть несохранённые изменения</span> : null}
            <button
              type="button"
              onClick={showPreview}
              className={adminCx(adminSecondaryButtonClassName, 'gap-2')}>
              <FiEye aria-hidden="true" />
              Предпросмотр
            </button>
            {canManage ? (
              <button
                type="submit"
                disabled={pending}
                className={adminCx(adminPrimaryButtonClassName, 'gap-2 disabled:opacity-60')}>
                <FiSave aria-hidden="true" />
                {pending ? 'Сохранение…' : 'Сохранить'}
              </button>
            ) : null}
          </div>
        </div>
      </form>

      <details className={adminDetailsClassName} open={images.length > 0}>
        <summary className={adminSummaryClassName}>
          <span className="inline-flex items-center gap-2">
            <FiImage aria-hidden="true" />
            Изображения страницы ({images.length})
          </span>
          <span className="text-xs font-medium text-[#7e9088]">общие для всех языков</span>
        </summary>
        <div className="border-t border-[#0b5a45]/10 bg-white p-4">
          <SitePageImagesPanel
            canManage={canManage}
            images={images}
            locale={locale}
            onInsert={canManage ? insertSnippet : undefined}
            pageId={pageId}
          />
        </div>
      </details>

      <section aria-label="Предпросмотр">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold text-[#0b3e31]">Предпросмотр</h3>
          <p className={adminHintClassName}>
            Показывает текущий текст из поля, даже несохранённый. Адрес на сайте: /
            {contentLocale}/{slug}
          </p>
        </div>
        <SitePagePreview ref={previewRef} onRefresh={showPreview} />
      </section>
    </div>
  );
}
