'use client';

import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  FiBold,
  FiImage,
  FiItalic,
  FiLink,
  FiList,
  FiMinus,
  FiType,
  FiUnderline,
} from 'react-icons/fi';
import { MdFormatListNumbered, MdFormatQuote } from 'react-icons/md';

type ToolbarItem = {
  active?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
};

const defaultToolbarState = {
  isBlockquote: false,
  isBold: false,
  isBulletList: false,
  isH2: false,
  isH3: false,
  isItalic: false,
  isLink: false,
  isOrderedList: false,
  isUnderline: false,
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function convertPlainTextToHtml(value: string) {
  const normalized = value.replace(/\r\n?/g, '\n').trim();

  if (!normalized) {
    return '';
  }

  return normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

function normalizeEditorHtml(editor: NonNullable<ReturnType<typeof useEditor>>) {
  return editor.isEmpty ? '' : editor.getHTML();
}

// FIX 1: Валидация URL для защиты от XSS (javascript:, data: и т.д.)
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'mailto:'
    );
  } catch {
    // Относительные URL — разрешаем
    return url.startsWith('/') || url.startsWith('#');
  }
}

const i18n: Record<string, Record<string, string>> = {
  en: {
    linkPrompt: 'Paste the link URL. Leave empty to remove the link.',
    insecureUrl: 'Only http://, https://, and mailto: links are allowed.',
    bold: 'Bold',
    italic: 'Italic',
    underline: 'Underline',
    bullets: 'Bullets',
    numbers: 'Numbers',
    quote: 'Quote',
    link: 'Link',
    image: 'Insert image',
    uploadingImage: 'Uploading image...',
    imageUploadError: 'Could not upload the image. Please try again.',
    imageInsertError: 'The image was uploaded but could not be inserted into the article.',
    imageTooLarge: 'The image must be no larger than 5 MB.',
    waitForImageUpload: 'Please wait until the image finishes uploading before saving.',
  },
  ru: {
    linkPrompt: 'Вставьте URL ссылки. Оставьте пустым, чтобы удалить ссылку.',
    insecureUrl: 'Разрешены только ссылки http://, https:// и mailto:.',
    bold: 'Жирный',
    italic: 'Курсив',
    underline: 'Подчеркнутый',
    bullets: 'Список',
    numbers: 'Нумерация',
    quote: 'Цитата',
    link: 'Ссылка',
    image: 'Вставить фото',
    uploadingImage: 'Фото загружается...',
    imageUploadError: 'Не удалось загрузить фото. Попробуйте ещё раз.',
    imageInsertError: 'Фото загрузилось, но не вставилось в статью.',
    imageTooLarge: 'Размер фото не должен превышать 5 МБ.',
    waitForImageUpload: 'Дождитесь окончания загрузки фото перед сохранением.',
  },
};

function t(locale: string, key: string): string {
  return i18n[locale]?.[key] ?? i18n['en'][key] ?? key;
}

export default function ArticleRichTextEditor({
  defaultValue = '',
  locale,
  name,
  placeholder,
}: {
  defaultValue?: string;
  locale: string;
  name: string;
  placeholder: string;
}) {
  const [html, setHtml] = useState(defaultValue);
  const [imageError, setImageError] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isUploadingImageRef = useRef(false);
  const lastDefaultValueRef = useRef(defaultValue);
  // FIX 2: useId для связи placeholder с редактором через aria-describedby
  const placeholderId = useId();
  const imageInputId = useId();

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
        link: false,
        underline: false,
      }),
      Underline,
      Image.configure({
        allowBase64: false,
        inline: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: {
          rel: 'noreferrer noopener',
          target: '_blank',
        },
      }),
    ],
    [],
  );

  const syncEditorHtml = useCallback(
    (nextEditor: NonNullable<ReturnType<typeof useEditor>>) => {
      setHtml(normalizeEditorHtml(nextEditor));
    },
    [],
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: defaultValue || '',
    editorProps: {
      attributes: {
        class:
          'admin-rich-text min-h-[240px] px-3.5 py-4 text-sm leading-7 text-[#0b3e31] outline-none sm:min-h-[300px] sm:px-5 sm:py-5 sm:text-[1rem]',
        // FIX 4: aria-describedby привязывает placeholder к редактору для скринридеров
        'aria-describedby': placeholderId,
        'aria-multiline': 'true',
        role: 'textbox',
      },
    },
    onCreate: ({ editor: nextEditor }) => {
      syncEditorHtml(nextEditor);
    },
    onUpdate: ({ editor: nextEditor }) => {
      syncEditorHtml(nextEditor);
    },
  });

  const editorState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (!currentEditor) {
        return defaultToolbarState;
      }

      return {
        isBlockquote: currentEditor.isActive('blockquote'),
        isBold: currentEditor.isActive('bold'),
        isBulletList: currentEditor.isActive('bulletList'),
        isH2: currentEditor.isActive('heading', { level: 2 }),
        isH3: currentEditor.isActive('heading', { level: 3 }),
        isItalic: currentEditor.isActive('italic'),
        isLink: currentEditor.isActive('link'),
        isOrderedList: currentEditor.isActive('orderedList'),
        isUnderline: currentEditor.isActive('underline'),
      };
    },
  });

  const toolbarState = editorState ?? defaultToolbarState;

  // Применяем defaultValue только когда с сервера действительно пришёл новый
  // контент. Локальный ререндер после загрузки изображения не должен возвращать
  // старое значение поверх уже изменённого документа Tiptap.
  useEffect(() => {
    if (!editor) {
      return;
    }

    const nextValue = defaultValue || '';
    if (lastDefaultValueRef.current === nextValue) {
      return;
    }

    lastDefaultValueRef.current = nextValue;

    if (normalizeEditorHtml(editor) !== nextValue) {
      editor.commands.setContent(nextValue, { emitUpdate: false });
    }
    syncEditorHtml(editor);
  }, [defaultValue, editor, syncEditorHtml]);

  useEffect(() => {
    const form = containerRef.current?.closest('form');

    if (!form) {
      return;
    }

    const handleSubmit = (event: SubmitEvent) => {
      if (!isUploadingImageRef.current) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setImageError(t(locale, 'waitForImageUpload'));
    };

    form.addEventListener('submit', handleSubmit, true);

    return () => {
      form.removeEventListener('submit', handleSubmit, true);
    };
  }, [locale]);

  useEffect(() => {
    const form = containerRef.current?.closest('form');

    if (!form) {
      return;
    }

    if (isUploadingImage) {
      form.setAttribute('aria-busy', 'true');
    } else {
      form.removeAttribute('aria-busy');
    }

    return () => {
      form.removeAttribute('aria-busy');
    };
  }, [isUploadingImage]);

  // FIX 6: Кастомный paste-обработчик теперь проверяет наличие HTML в буфере.
  // Если HTML есть — пропускаем, Tiptap сам его обработает корректно.
  // Кастомная логика нужна только для чистого plain text без HTML.
  useEffect(() => {
    if (!editor) {
      return;
    }

    const dom = editor.view.dom;

    const handlePaste = (event: ClipboardEvent) => {
      const clipboardData = event.clipboardData;
      if (!clipboardData) return;

      // Если в буфере есть HTML — не вмешиваемся, Tiptap обработает сам
      const htmlContent = clipboardData.getData('text/html');
      if (htmlContent) {
        return;
      }

      const plainText = clipboardData.getData('text/plain') ?? '';
      const nextHtml = convertPlainTextToHtml(plainText);

      if (!nextHtml) {
        return;
      }

      event.preventDefault();
      editor.chain().focus().insertContent(nextHtml).run();
    };

    dom.addEventListener('paste', handlePaste);

    return () => {
      dom.removeEventListener('paste', handlePaste);
    };
  }, [editor]);

  const setLink = () => {
    if (!editor) {
      return;
    }

    const previousUrl = String(editor.getAttributes('link').href ?? '');
    const nextUrl = window.prompt(t(locale, 'linkPrompt'), previousUrl);

    if (nextUrl === null) {
      return;
    }

    if (!nextUrl.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    const trimmed = nextUrl.trim();

    // FIX 7: Валидация URL перед вставкой — защита от XSS (javascript:, data: и т.д.)
    if (!isSafeUrl(trimmed)) {
      window.alert(t(locale, 'insecureUrl'));
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run();
  };

  const uploadImage = async (file: File) => {
    if (!editor) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError(t(locale, 'imageTooLarge'));
      return;
    }

    setImageError('');
    isUploadingImageRef.current = true;
    setIsUploadingImage(true);

    try {
      const payload = new FormData();
      payload.append('image', file);

      const response = await fetch('/admin-api/article-images', {
        method: 'POST',
        body: payload,
      });
      const data = (await response.json().catch(() => null)) as {
        message?: string | string[];
        url?: string;
      } | null;

      if (!response.ok || !data?.url) {
        const message = Array.isArray(data?.message)
          ? data.message.join(', ')
          : data?.message;
        throw new Error(message || 'Image upload failed');
      }

      const alt = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      const inserted = editor
        .chain()
        .focus()
        .setImage({ src: data.url, alt })
        .run();

      if (!inserted) {
        throw new Error(t(locale, 'imageInsertError'));
      }

      syncEditorHtml(editor);
    } catch (error) {
      setImageError(
        error instanceof Error && error.message !== 'Image upload failed'
          ? error.message
          : t(locale, 'imageUploadError'),
      );
    } finally {
      isUploadingImageRef.current = false;
      setIsUploadingImage(false);
      setImageError((currentError) =>
        currentError === t(locale, 'waitForImageUpload') ? '' : currentError,
      );
    }
  };

  const toolbar: ToolbarItem[] = [
    {
      active: toolbarState.isH2,
      disabled: !editor,
      icon: <FiType />,
      label: 'H2',
      onClick: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      active: toolbarState.isH3,
      disabled: !editor,
      icon: <FiMinus />,
      label: 'H3',
      onClick: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      active: toolbarState.isBold,
      disabled: !editor,
      icon: <FiBold />,
      label: t(locale, 'bold'),
      onClick: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      active: toolbarState.isItalic,
      disabled: !editor,
      icon: <FiItalic />,
      label: t(locale, 'italic'),
      onClick: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      active: toolbarState.isUnderline,
      disabled: !editor,
      icon: <FiUnderline />,
      label: t(locale, 'underline'),
      onClick: () => editor?.chain().focus().toggleUnderline().run(),
    },
    {
      active: toolbarState.isBulletList,
      disabled: !editor,
      icon: <FiList />,
      label: t(locale, 'bullets'),
      onClick: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      active: toolbarState.isOrderedList,
      disabled: !editor,
      icon: <MdFormatListNumbered />,
      label: t(locale, 'numbers'),
      onClick: () => editor?.chain().focus().toggleOrderedList().run(),
    },
    {
      active: toolbarState.isBlockquote,
      disabled: !editor,
      icon: <MdFormatQuote />,
      label: t(locale, 'quote'),
      onClick: () => editor?.chain().focus().toggleBlockquote().run(),
    },
    {
      active: toolbarState.isLink,
      disabled: !editor,
      icon: <FiLink />,
      label: t(locale, 'link'),
      onClick: setLink,
    },
  ];

  return (
    <div
      ref={containerRef}
      className="min-w-0 overflow-hidden rounded-lg border border-[#0b5a45]/12 bg-[#f8f7f2] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]"
    >
      <input
        type="hidden"
        name={name}
        value={html}
        readOnly
      />
      <input
        id={imageInputId}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const input = event.currentTarget;
          const file = event.target.files?.[0];
          if (file) {
            void uploadImage(file).finally(() => {
              input.value = '';
            });
          }
        }}
      />

      <div
        role="toolbar"
        aria-label={name}
        className="flex flex-nowrap gap-2 overflow-x-auto border-b border-[#0b5a45]/10 bg-white/75 px-3 py-3 sm:flex-wrap sm:px-4">
        {toolbar.map((item) => (
          <button
            key={`${name}-${item.label}`}
            type="button"
            title={item.label}
            aria-label={item.label}
            aria-pressed={item.active}
            disabled={item.disabled}
            onMouseDown={(event) => {
              event.preventDefault();
              item.onClick();
            }}
            className={`inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-lg border px-2.5 transition sm:h-11 sm:min-w-11 sm:px-3 ${
              item.active
                ? 'border-[#0b5a45] bg-[#0b5a45] text-white'
                : 'border-[#0b5a45]/12 bg-white text-[#0b3e31] hover:border-[#0b5a45]/30 hover:bg-[#eef4ef]'
            } ${item.disabled ? 'cursor-not-allowed opacity-50' : ''}`}>
            {item.icon}
          </button>
        ))}
        <label
          htmlFor={imageInputId}
          title={isUploadingImage ? t(locale, 'uploadingImage') : t(locale, 'image')}
          aria-label={isUploadingImage ? t(locale, 'uploadingImage') : t(locale, 'image')}
          aria-disabled={!editor || isUploadingImage}
          className={`inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-lg border border-[#0b5a45]/12 bg-white px-2.5 text-[#0b3e31] transition hover:border-[#0b5a45]/30 hover:bg-[#eef4ef] sm:h-11 sm:min-w-11 sm:px-3 ${
            !editor || isUploadingImage
              ? 'pointer-events-none cursor-not-allowed opacity-50'
              : 'cursor-pointer'
          }`}
        >
          <FiImage />
        </label>
      </div>

      <div className="relative">
        {/* FIX 8: id привязан к aria-describedby редактора, hidden скрывает от визуала
            но оставляет доступным для скринридеров через aria-describedby */}
        <span id={placeholderId} hidden>
          {placeholder}
        </span>

        {!editor || editor.isEmpty ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-3.5 top-4 text-sm leading-6 text-[#7e9088] sm:inset-x-5 sm:top-5">
            {placeholder}
          </div>
        ) : null}

        <EditorContent editor={editor} />
      </div>

      {imageError ? (
        <p role="alert" className="border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {imageError}
        </p>
      ) : isUploadingImage ? (
        <p className="border-t border-[#0b5a45]/10 px-4 py-2 text-sm text-[#567068]">
          {t(locale, 'uploadingImage')}
        </p>
      ) : null}
    </div>
  );
}
