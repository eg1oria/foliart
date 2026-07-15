'use client';

import FileHandler from '@tiptap/extension-file-handler';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  FiBold,
  FiImage,
  FiItalic,
  FiLink,
  FiList,
  FiUnderline,
  FiX,
  FiRefreshCw,
} from 'react-icons/fi';
import { MdFormatListNumbered, MdFormatQuote } from 'react-icons/md';
import { createArticleExtensions, type ArticleDocument } from '../../lib/articleContent';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export type UploadedArticleMedia = {
  id: string;
  publicUrl: string;
  previewUrl: string;
  width: number;
  height: number;
};

type UploadFailure = {
  uploadId: string;
  file: File;
  message: string;
  retryable: boolean;
};

const EMPTY_TOOLBAR_STATE = {
  h2: false,
  h3: false,
  h4: false,
  bold: false,
  italic: false,
  underline: false,
  bullet: false,
  ordered: false,
  quote: false,
  link: false,
  empty: true,
};

type ToolbarState = typeof EMPTY_TOOLBAR_STATE;
type ToolbarActionKey = Exclude<keyof ToolbarState, 'empty'>;
type ToolbarItem = {
  key: ToolbarActionKey;
  label: string;
  icon: ReactNode;
  action: () => void;
  shortcut?: string;
};

function findUploadPosition(editor: Editor, uploadId: string) {
  let found: { from: number; to: number } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'imageUpload' && node.attrs.uploadId === uploadId) {
      found = { from: pos, to: pos + node.nodeSize };
      return false;
    }
    return true;
  });
  return found;
}

function normalizeSafeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('//') || /[\u0000-\u001f\u007f]/.test(trimmed)) return null;
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed;

  const hasProtocol = /^[a-z][a-z\d+.-]*:/i.test(trimmed);
  try {
    const url = new URL(hasProtocol ? trimmed : `https://${trimmed}`);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export default function ArticleRichTextEditor({
  defaultDocument,
  locale,
  onBeforeUpload,
  onChange,
  onUpload,
  placeholder,
}: {
  defaultDocument: ArticleDocument;
  locale: string;
  onBeforeUpload: (document: ArticleDocument) => Promise<void>;
  onChange: (document: ArticleDocument) => void;
  onUpload: (file: File, uploadId: string) => Promise<UploadedArticleMedia>;
  placeholder: string;
}) {
  const [failures, setFailures] = useState<UploadFailure[]>([]);
  const [activeUploads, setActiveUploads] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const imagePositionRef = useRef<number | undefined>(undefined);
  const uploadingIdsRef = useRef(new Set<string>());
  const changeRef = useRef(onChange);
  const uploadHandlerRef = useRef<
    ((file: File, pos?: number, reuseId?: string) => Promise<void>) | undefined
  >(undefined);
  changeRef.current = onChange;

  const extensions = useMemo(
    () => [
      ...createArticleExtensions(true),
      FileHandler.configure({
        consumePasteEvent: true,
        onPaste: (currentEditor, files) => {
          const position = currentEditor.state.selection.from;
          files.forEach((file, index) => {
            void uploadHandlerRef.current?.(file, position + index);
          });
        },
        onDrop: (_editor, files, pos) => {
          files.forEach((file, index) => {
            void uploadHandlerRef.current?.(file, pos + index);
          });
        },
      }),
    ],
    [],
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: defaultDocument,
    editorProps: {
      attributes: {
        class:
          'admin-rich-text min-h-[280px] px-4 py-5 text-[1rem] leading-7 text-[#0b3e31] outline-none sm:min-h-[340px] sm:px-5',
        'aria-label': placeholder,
        'aria-multiline': 'true',
        role: 'textbox',
      },
    },
    onUpdate: ({ editor: nextEditor }) => changeRef.current(nextEditor.getJSON()),
  });

  useEffect(() => {
    if (!editor) return;
    if (JSON.stringify(editor.getJSON()) === JSON.stringify(defaultDocument)) return;
    editor.commands.setContent(defaultDocument, { emitUpdate: false });
  }, [defaultDocument, editor]);

  const toolbarState =
    useEditorState({
      editor,
      selector: ({ editor: current }) => ({
        h2: current?.isActive('heading', { level: 2 }) ?? false,
        h3: current?.isActive('heading', { level: 3 }) ?? false,
        h4: current?.isActive('heading', { level: 4 }) ?? false,
        bold: current?.isActive('bold') ?? false,
        italic: current?.isActive('italic') ?? false,
        underline: current?.isActive('underline') ?? false,
        bullet: current?.isActive('bulletList') ?? false,
        ordered: current?.isActive('orderedList') ?? false,
        quote: current?.isActive('blockquote') ?? false,
        link: current?.isActive('link') ?? false,
        empty: current?.isEmpty ?? true,
      }),
    }) ?? EMPTY_TOOLBAR_STATE;

  const performUpload = useCallback(
    async (file: File, pos?: number, reuseId?: string) => {
      if (!editor) return;

      const uploadId = reuseId ?? crypto.randomUUID();
      if (uploadingIdsRef.current.has(uploadId)) return;

      const validationMessage = !ALLOWED_IMAGE_TYPES.includes(file.type)
        ? locale === 'ru'
          ? 'Поддерживаются только JPG, PNG, WEBP и GIF.'
          : 'Only JPG, PNG, WEBP, and GIF images are supported.'
        : file.size > MAX_IMAGE_SIZE
          ? locale === 'ru'
            ? 'Размер изображения не должен превышать 5 МБ.'
            : 'The image must be no larger than 5 MB.'
          : '';

      if (validationMessage) {
        setFailures((items) => [
          ...items.filter((item) => item.uploadId !== uploadId),
          { uploadId, file, message: validationMessage, retryable: false },
        ]);
        return;
      }

      if (!reuseId || !findUploadPosition(editor, uploadId)) {
        editor.commands.insertContentAt(pos ?? editor.state.selection.from, {
          type: 'imageUpload',
          attrs: { uploadId, alt: file.name.replace(/\.[^.]+$/, '') },
        });
      }

      setFailures((items) => items.filter((item) => item.uploadId !== uploadId));
      uploadingIdsRef.current.add(uploadId);
      setActiveUploads((count) => count + 1);

      try {
        await onBeforeUpload(editor.getJSON());
        const media = await onUpload(file, uploadId);
        const range = findUploadPosition(editor, uploadId);
        if (!range) return;
        editor.commands.insertContentAt(range, {
          type: 'image',
          attrs: {
            mediaId: media.id,
            src: media.publicUrl,
            alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
            width: media.width,
            height: media.height,
          },
        });
      } catch (error) {
        setFailures((items) => [
          ...items.filter((item) => item.uploadId !== uploadId),
          {
            uploadId,
            file,
            message:
              error instanceof Error
                ? error.message
                : locale === 'ru'
                  ? 'Не удалось загрузить изображение.'
                  : 'Could not upload the image.',
            retryable: true,
          },
        ]);
      } finally {
        uploadingIdsRef.current.delete(uploadId);
        setActiveUploads((count) => Math.max(0, count - 1));
      }
    },
    [editor, locale, onBeforeUpload, onUpload],
  );
  uploadHandlerRef.current = performUpload;

  const removeFailure = (uploadId: string) => {
    if (!editor) return;
    const range = findUploadPosition(editor, uploadId);
    if (range) editor.commands.deleteRange(range);
    setFailures((items) => items.filter((item) => item.uploadId !== uploadId));
  };

  const setLink = () => {
    if (!editor) return;
    const previous = String(editor.getAttributes('link').href ?? '');
    const value = window.prompt(
      locale === 'ru'
        ? 'Введите адрес ссылки. Оставьте поле пустым, чтобы удалить ссылку.'
        : 'Enter the link URL. Leave empty to remove the link.',
      previous,
    );
    if (value === null) return;
    if (!value.trim()) return void editor.chain().focus().extendMarkRange('link').unsetLink().run();
    const safeUrl = normalizeSafeUrl(value);
    if (!safeUrl) {
      window.alert(locale === 'ru' ? 'Небезопасный URL.' : 'Unsafe URL.');
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: safeUrl }).run();
  };

  const toolbar: ToolbarItem[] = [
    {
      key: 'h2',
      label: 'H2',
      icon: (
        <span aria-hidden="true" className="text-sm font-bold">
          H2
        </span>
      ),
      action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      key: 'h3',
      label: 'H3',
      icon: (
        <span aria-hidden="true" className="text-sm font-bold">
          H3
        </span>
      ),
      action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      key: 'h4',
      label: 'H4',
      icon: (
        <span aria-hidden="true" className="text-sm font-bold">
          H4
        </span>
      ),
      action: () => editor?.chain().focus().toggleHeading({ level: 4 }).run(),
    },
    {
      key: 'bold',
      label: locale === 'ru' ? 'Жирный' : 'Bold',
      icon: <FiBold aria-hidden="true" />,
      action: () => editor?.chain().focus().toggleBold().run(),
      shortcut: 'Control+B',
    },
    {
      key: 'italic',
      label: locale === 'ru' ? 'Курсив' : 'Italic',
      icon: <FiItalic aria-hidden="true" />,
      action: () => editor?.chain().focus().toggleItalic().run(),
      shortcut: 'Control+I',
    },
    {
      key: 'underline',
      label: locale === 'ru' ? 'Подчёркнутый' : 'Underline',
      icon: <FiUnderline aria-hidden="true" />,
      action: () => editor?.chain().focus().toggleUnderline().run(),
      shortcut: 'Control+U',
    },
    {
      key: 'bullet',
      label: locale === 'ru' ? 'Маркированный список' : 'Bullet list',
      icon: <FiList aria-hidden="true" />,
      action: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      key: 'ordered',
      label: locale === 'ru' ? 'Нумерованный список' : 'Numbered list',
      icon: <MdFormatListNumbered aria-hidden="true" />,
      action: () => editor?.chain().focus().toggleOrderedList().run(),
    },
    {
      key: 'quote',
      label: locale === 'ru' ? 'Цитата' : 'Quote',
      icon: <MdFormatQuote aria-hidden="true" />,
      action: () => editor?.chain().focus().toggleBlockquote().run(),
    },
    {
      key: 'link',
      label: locale === 'ru' ? 'Ссылка' : 'Link',
      icon: <FiLink aria-hidden="true" />,
      action: setLink,
    },
  ];

  const button = (
    key: ToolbarActionKey,
    label: string,
    icon: ReactNode,
    action: () => void,
    shortcut?: string,
  ) => (
    <button
      key={key}
      type="button"
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      aria-keyshortcuts={shortcut}
      aria-pressed={toolbarState[key]}
      disabled={!editor}
      onPointerDown={(event) => event.preventDefault()}
      onClick={action}
      className={`inline-flex h-10 min-w-10 items-center justify-center rounded-lg border px-2.5 transition ${
        toolbarState[key]
          ? 'border-[#0b5a45] bg-[#0b5a45] text-white'
          : 'border-[#0b5a45]/12 bg-white text-[#0b3e31] hover:border-[#0b5a45]/30 hover:bg-[#eef4ef]'
      } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5a45] disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {icon}
    </button>
  );

  return (
    <div className="overflow-hidden rounded-lg border border-[#0b5a45]/12 bg-[#f8f7f2]">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          const position = imagePositionRef.current;
          imagePositionRef.current = undefined;
          if (file) void performUpload(file, position);
          event.currentTarget.value = '';
        }}
      />
      <div
        role="toolbar"
        aria-label={locale === 'ru' ? 'Форматирование статьи' : 'Article formatting'}
        className="flex flex-nowrap gap-2 overflow-x-auto border-b border-[#0b5a45]/10 bg-white/75 p-3 sm:flex-wrap"
      >
        {toolbar.map((item) =>
          button(item.key, item.label, item.icon, item.action, item.shortcut),
        )}
        <button
          type="button"
          title={locale === 'ru' ? 'Вставить изображение' : 'Insert image'}
          aria-label={locale === 'ru' ? 'Вставить изображение' : 'Insert image'}
          disabled={!editor}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => {
            if (!editor) return;
            imagePositionRef.current = editor.state.selection.from;
            inputRef.current?.click();
          }}
          className="inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-lg border border-[#0b5a45]/12 bg-white px-2.5 text-[#0b3e31] transition hover:border-[#0b5a45]/30 hover:bg-[#eef4ef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5a45] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FiImage aria-hidden="true" />
        </button>
      </div>
      <div className="relative">
        {toolbarState.empty ? (
          <p className="pointer-events-none absolute left-5 top-5 text-sm text-[#7e9088]">{placeholder}</p>
        ) : null}
        <EditorContent editor={editor} />
      </div>
      {activeUploads ? (
        <p className="border-t border-[#0b5a45]/10 px-4 py-2 text-sm text-[#567068]">
          {locale === 'ru' ? `Загрузка изображений: ${activeUploads}` : `Uploading images: ${activeUploads}`}
        </p>
      ) : null}
      {failures.map((failure) => (
        <div key={failure.uploadId} role="alert" className="flex items-center gap-3 border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          <span className="min-w-0 flex-1">{failure.message}</span>
          {failure.retryable ? (
            <button
              type="button"
              title={locale === 'ru' ? 'Повторить загрузку' : 'Retry upload'}
              onClick={() => void performUpload(failure.file, undefined, failure.uploadId)}
              aria-label={locale === 'ru' ? 'Повторить загрузку' : 'Retry upload'}
              className="rounded-md p-2 transition hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-red-700 disabled:opacity-50"
              disabled={uploadingIdsRef.current.has(failure.uploadId)}
            >
              <FiRefreshCw aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            title={locale === 'ru' ? 'Убрать сообщение' : 'Dismiss message'}
            onClick={() => removeFailure(failure.uploadId)}
            aria-label={locale === 'ru' ? 'Убрать сообщение' : 'Dismiss message'}
            className="rounded-md p-2 transition hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-red-700"
          >
            <FiX aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
