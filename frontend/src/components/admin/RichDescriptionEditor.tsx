'use client';

import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { useEffect, useMemo, useRef } from 'react';
import { FiBold } from 'react-icons/fi';

import { prepareRichDescriptionHtml } from '@/lib/richDescription';

export default function RichDescriptionEditor({
  defaultValue,
  label,
  name = 'description',
  onContentChange,
  placeholder,
  required = false,
}: {
  defaultValue: string;
  label: string;
  name?: string;
  onContentChange?: () => void;
  placeholder?: string;
  required?: boolean;
}) {
  const initialContent = useMemo(() => prepareRichDescriptionHtml(defaultValue), [defaultValue]);
  const inputRef = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        blockquote: false,
        bulletList: false,
        code: false,
        codeBlock: false,
        dropcursor: false,
        gapcursor: false,
        heading: false,
        horizontalRule: false,
        italic: false,
        link: false,
        listItem: false,
        listKeymap: false,
        orderedList: false,
        strike: false,
        trailingNode: false,
        underline: false,
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        'aria-label': label,
        'aria-multiline': 'true',
        'aria-required': String(required),
        class:
          'admin-description-editor min-h-[132px] px-3.5 py-3 text-sm leading-6 text-[#0b3e31] outline-none',
        role: 'textbox',
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      if (inputRef.current) {
        inputRef.current.value = nextEditor.isEmpty ? '' : nextEditor.getHTML();
      }
      onContentChange?.();
    },
  });
  const editorState =
    useEditorState({
      editor,
      selector: ({ editor: currentEditor }) => ({
        boldActive: currentEditor?.isActive('bold') ?? false,
        empty: currentEditor?.isEmpty ?? true,
      }),
    }) ?? { boldActive: false, empty: true };

  useEffect(() => {
    if (!editor || editor.getHTML() === initialContent) return;
    editor.commands.setContent(initialContent, { emitUpdate: false });
    if (inputRef.current) {
      inputRef.current.value = editor.isEmpty ? '' : editor.getHTML();
    }
  }, [editor, initialContent]);

  return (
    <div className="overflow-hidden rounded-lg border border-[#0b5a45]/15 bg-[#f8f7f2] focus-within:border-[#0b5a45]/35 focus-within:ring-2 focus-within:ring-[#0b5a45]/10">
      <input
        ref={inputRef}
        type="hidden"
        name={name}
        defaultValue={defaultValue.trim() ? initialContent : ''}
      />
      <div
        role="toolbar"
        aria-label={`${label}: форматирование`}
        className="flex items-center gap-2 border-b border-[#0b5a45]/10 bg-white/80 p-2"
      >
        <button
          type="button"
          title="Жирный (Ctrl+B)"
          aria-label="Жирный"
          aria-pressed={editorState.boldActive}
          disabled={!editor}
          onMouseDown={(event) => {
            event.preventDefault();
            editor?.chain().focus().toggleBold().run();
          }}
          className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition ${
            editorState.boldActive
              ? 'border-[#0b5a45] bg-[#0b5a45] text-white'
              : 'border-[#0b5a45]/15 bg-white text-[#0b3e31] hover:bg-[#eef4ef]'
          }`}
        >
          <FiBold aria-hidden="true" />
          Жирный
        </button>
        <span className="text-xs leading-5 text-[#6a7f76]">
          Выделите текст или абзац и нажмите кнопку
        </span>
      </div>
      <div className="relative">
        {editorState.empty ? (
          <p className="pointer-events-none absolute left-3.5 top-3 text-sm text-[#7e9088]">
            {placeholder ?? 'Введите описание'}
          </p>
        ) : null}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
