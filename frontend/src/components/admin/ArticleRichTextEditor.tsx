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
  FiType,
  FiUnderline,
  FiX,
  FiRefreshCw,
} from 'react-icons/fi';
import { MdFormatListNumbered, MdFormatQuote } from 'react-icons/md';
import { createArticleExtensions, type ArticleDocument } from '../../lib/articleContent';

export type UploadedArticleMedia = {
  id: string;
  publicUrl: string;
  previewUrl: string;
  width: number;
  height: number;
};

type UploadFailure = { uploadId: string; file: File; message: string };

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

function isSafeUrl(value: string) {
  return (
    !value.startsWith('//') &&
    !/^(?:javascript|data|vbscript):/i.test(value) &&
    (/^(?:https?:|mailto:|tel:)/i.test(value) || value.startsWith('/') || value.startsWith('#'))
  );
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
  const changeRef = useRef(onChange);
  const uploadHandlerRef = useRef<
    ((file: File, pos?: number, reuseId?: string) => Promise<void>) | undefined
  >(undefined);
  changeRef.current = onChange;

  const extensions = useMemo(
    () => [
      ...createArticleExtensions(true),
      FileHandler.configure({
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        consumePasteEvent: true,
        onPaste: (_editor, files) => {
          files.forEach((file) => void uploadHandlerRef.current?.(file));
        },
        onDrop: (_editor, files, pos) => {
          files.forEach((file, index) => void uploadHandlerRef.current?.(file, pos + index));
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
      }),
    }) ?? {};

  const performUpload = useCallback(
    async (file: File, pos?: number, reuseId?: string) => {
      if (!editor) return;
      if (file.size > 5 * 1024 * 1024) {
        setFailures((items) => [
          ...items,
          { uploadId: reuseId ?? crypto.randomUUID(), file, message: locale === 'ru' ? 'Файл больше 5 МБ.' : 'The file is larger than 5 MB.' },
        ]);
        return;
      }
      const uploadId = reuseId ?? crypto.randomUUID();
      if (!reuseId) {
        editor.commands.insertContentAt(pos ?? editor.state.selection.from, {
          type: 'imageUpload',
          attrs: { uploadId, alt: file.name.replace(/\.[^.]+$/, '') },
        });
      }
      setFailures((items) => items.filter((item) => item.uploadId !== uploadId));
      setActiveUploads((count) => count + 1);
      try {
        await onBeforeUpload(editor.getJSON());
        const media = await onUpload(file, uploadId);
        const range = findUploadPosition(editor, uploadId);
        if (!range) throw new Error('Image placeholder is missing');
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
          },
        ]);
      } finally {
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
    const value = window.prompt(locale === 'ru' ? 'Введите URL ссылки' : 'Enter link URL', previous);
    if (value === null) return;
    if (!value.trim()) return void editor.chain().focus().extendMarkRange('link').unsetLink().run();
    if (!isSafeUrl(value.trim())) {
      window.alert(locale === 'ru' ? 'Небезопасный URL.' : 'Unsafe URL.');
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: value.trim() }).run();
  };

  const button = (key: string, label: string, icon: ReactNode, action: () => void) => (
    <button
      key={key}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={Boolean(toolbarState[key as keyof typeof toolbarState])}
      disabled={!editor}
      onMouseDown={(event) => {
        event.preventDefault();
        action();
      }}
      className={`inline-flex h-10 min-w-10 items-center justify-center rounded-lg border px-2.5 transition ${
        toolbarState[key as keyof typeof toolbarState]
          ? 'border-[#0b5a45] bg-[#0b5a45] text-white'
          : 'border-[#0b5a45]/12 bg-white text-[#0b3e31] hover:bg-[#eef4ef]'
      }`}
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
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void performUpload(file);
          event.currentTarget.value = '';
        }}
      />
      <div role="toolbar" className="flex flex-wrap gap-2 border-b border-[#0b5a45]/10 bg-white/75 p-3">
        {button('h2', 'H2', <FiType />, () => editor?.chain().focus().toggleHeading({ level: 2 }).run())}
        {button('h3', 'H3', <FiType />, () => editor?.chain().focus().toggleHeading({ level: 3 }).run())}
        {button('h4', 'H4', <FiType />, () => editor?.chain().focus().toggleHeading({ level: 4 }).run())}
        {button('bold', locale === 'ru' ? 'Жирный' : 'Bold', <FiBold />, () => editor?.chain().focus().toggleBold().run())}
        {button('italic', locale === 'ru' ? 'Курсив' : 'Italic', <FiItalic />, () => editor?.chain().focus().toggleItalic().run())}
        {button('underline', locale === 'ru' ? 'Подчёркнутый' : 'Underline', <FiUnderline />, () => editor?.chain().focus().toggleUnderline().run())}
        {button('bullet', locale === 'ru' ? 'Список' : 'Bullets', <FiList />, () => editor?.chain().focus().toggleBulletList().run())}
        {button('ordered', locale === 'ru' ? 'Нумерация' : 'Numbers', <MdFormatListNumbered />, () => editor?.chain().focus().toggleOrderedList().run())}
        {button('quote', locale === 'ru' ? 'Цитата' : 'Quote', <MdFormatQuote />, () => editor?.chain().focus().toggleBlockquote().run())}
        {button('link', locale === 'ru' ? 'Ссылка' : 'Link', <FiLink />, setLink)}
        <button
          type="button"
          title={locale === 'ru' ? 'Изображение' : 'Image'}
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-[#0b5a45]/12 bg-white text-[#0b3e31]"
        >
          <FiImage />
        </button>
      </div>
      <div className="relative">
        {editor?.isEmpty ? (
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
          <button type="button" onClick={() => void performUpload(failure.file, undefined, failure.uploadId)} aria-label="Retry">
            <FiRefreshCw />
          </button>
          <button type="button" onClick={() => removeFailure(failure.uploadId)} aria-label="Remove">
            <FiX />
          </button>
        </div>
      ))}
    </div>
  );
}
