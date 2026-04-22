'use client';

import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  FiBold,
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
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
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
          'admin-rich-text min-h-[280px] px-4 py-4 text-[1rem] leading-7 text-[#0b3e31] outline-none',
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

  useEffect(() => {
    if (!editor) {
      return;
    }

    const nextValue = defaultValue || '';
    const currentValue = normalizeEditorHtml(editor);

    if (currentValue === nextValue) {
      return;
    }

    editor.commands.setContent(nextValue);
  }, [defaultValue, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const dom = editor.view.dom;
    const handlePaste = (event: ClipboardEvent) => {
      const plainText = event.clipboardData?.getData('text/plain') ?? '';
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
    const nextUrl = window.prompt(
      locale === 'en'
        ? 'Paste the link URL. Leave empty to remove the link.'
        : 'Вставьте URL ссылки. Оставьте пустым, чтобы удалить ссылку.',
      previousUrl,
    );

    if (nextUrl === null) {
      return;
    }

    if (!nextUrl.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: nextUrl.trim() }).run();
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
      label: locale === 'en' ? 'Bold' : 'Жирный',
      onClick: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      active: toolbarState.isItalic,
      disabled: !editor,
      icon: <FiItalic />,
      label: locale === 'en' ? 'Italic' : 'Курсив',
      onClick: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      active: toolbarState.isUnderline,
      disabled: !editor,
      icon: <FiUnderline />,
      label: locale === 'en' ? 'Underline' : 'Подчеркнутый',
      onClick: () => editor?.chain().focus().toggleUnderline().run(),
    },
    {
      active: toolbarState.isBulletList,
      disabled: !editor,
      icon: <FiList />,
      label: locale === 'en' ? 'Bullets' : 'Список',
      onClick: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      active: toolbarState.isOrderedList,
      disabled: !editor,
      icon: <MdFormatListNumbered />,
      label: locale === 'en' ? 'Numbers' : 'Нумерация',
      onClick: () => editor?.chain().focus().toggleOrderedList().run(),
    },
    {
      active: toolbarState.isBlockquote,
      disabled: !editor,
      icon: <MdFormatQuote />,
      label: locale === 'en' ? 'Quote' : 'Цитата',
      onClick: () => editor?.chain().focus().toggleBlockquote().run(),
    },
    {
      active: toolbarState.isLink,
      disabled: !editor,
      icon: <FiLink />,
      label: locale === 'en' ? 'Link' : 'Ссылка',
      onClick: setLink,
    },
  ];

  return (
    <div className="overflow-hidden rounded-[1.6rem] border border-[#0b5a45]/12 bg-[#f8f7f2]">
      <input type="hidden" name={name} value={html} />

      <div className="flex flex-wrap gap-2 border-b border-[#0b5a45]/10 bg-white/75 px-4 py-3">
        {toolbar.map((item) => (
          <button
            key={`${name}-${item.label}`}
            type="button"
            title={item.label}
            disabled={item.disabled}
            onMouseDown={(event) => {
              event.preventDefault();
              item.onClick();
            }}
            className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 transition ${
              item.active
                ? 'border-[#0b5a45] bg-[#0b5a45] text-white'
                : 'border-[#0b5a45]/12 bg-white text-[#0b3e31] hover:border-[#0b5a45]/30 hover:bg-[#eef4ef]'
            } ${item.disabled ? 'cursor-not-allowed opacity-50' : ''}`}>
            {item.icon}
          </button>
        ))}
      </div>

      <div className="relative">
        {!editor || editor.isEmpty ? (
          <div className="pointer-events-none absolute left-4 top-4 text-sm text-[#7e9088]">
            {placeholder}
          </div>
        ) : null}

        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
