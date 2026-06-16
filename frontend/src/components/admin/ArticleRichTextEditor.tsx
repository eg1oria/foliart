'use client';

import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import type { ReactNode } from 'react';
import { useEffect, useId, useState } from 'react';
import { FiBold, FiItalic, FiLink, FiList, FiMinus, FiType, FiUnderline } from 'react-icons/fi';
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
  // FIX 2: useId для связи placeholder с редактором через aria-describedby
  const placeholderId = useId();

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
        // FIX 3: Убраны `link: false` и `underline: false` — их нет в StarterKit,
        // эти ключи молча игнорировались и создавали ложное ощущение отключения.
      }),
      Underline,
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
      setHtml(normalizeEditorHtml(nextEditor));
    },
    onUpdate: ({ editor: nextEditor }) => {
      setHtml(normalizeEditorHtml(nextEditor));
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

  // FIX 5: Синхронизация defaultValue не трогает редактор если он в фокусе,
  // чтобы не сбрасывать набранный текст при быстрых обновлениях пропа.
  useEffect(() => {
    if (!editor) {
      return;
    }

    const nextValue = defaultValue || '';
    const currentValue = normalizeEditorHtml(editor);

    if (currentValue === nextValue) {
      return;
    }

    // Не перезаписываем контент пока пользователь редактирует
    if (editor.isFocused) {
      return;
    }

    editor.commands.setContent(nextValue);
  }, [defaultValue, editor]);

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
    <div className="min-w-0 overflow-hidden rounded-lg border border-[#0b5a45]/12 bg-[#f8f7f2] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
      <input type="hidden" name={name} value={html} />

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
    </div>
  );
}
