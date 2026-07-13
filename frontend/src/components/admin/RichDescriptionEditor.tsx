'use client';

import { Extension, type Editor } from '@tiptap/core';
import { Fragment, Slice, type Node as ProseMirrorNode } from '@tiptap/pm/model';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FiBold, FiType } from 'react-icons/fi';

import { prepareRichDescriptionHtml } from '../../lib/richDescription';

const DescriptionEnterBehavior = Extension.create({
  name: 'descriptionEnterBehavior',
  priority: 1_000,
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { $from } = this.editor.state.selection;
        const previousNode = $from.nodeBefore;

        if (previousNode?.type.name === 'hardBreak') {
          return this.editor
            .chain()
            .deleteRange({ from: $from.pos - previousNode.nodeSize, to: $from.pos })
            .splitBlock()
            .run();
        }

        return this.editor.commands.setHardBreak();
      },
    };
  },
});

function createPlainTextSlice(text: string, schema: Parameters<typeof Slice.fromJSON>[0]) {
  const paragraph = schema.nodes.paragraph;
  const hardBreak = schema.nodes.hardBreak;
  if (!paragraph || !hardBreak) return null;

  const blocks = text.replace(/\r\n?/g, '\n').split(/\n{2,}/);
  const paragraphs = blocks.map((block) => {
    const content: ProseMirrorNode[] = [];

    block.split('\n').forEach((line, index) => {
      if (index > 0) content.push(hardBreak.create());
      if (line) content.push(schema.text(line));
    });

    return paragraph.create(null, content);
  });

  return new Slice(Fragment.fromArray(paragraphs), 0, 0);
}

function boldLineLabels(editor: Editor) {
  const ranges: Array<{ from: number; to: number }> = [];

  editor.state.doc.descendants((node, position) => {
    if (node.type.name !== 'paragraph') return true;

    const text = node.textBetween(0, node.content.size, '\n', '\n');
    const labelPattern = /(?:^|\n)([^\s:\n][^:\n]{0,58}:)(?=\s|$)/g;
    let match: RegExpExecArray | null;

    while ((match = labelPattern.exec(text))) {
      const lineOffset = match.index + (match[0].startsWith('\n') ? 1 : 0);
      const from = position + 1 + lineOffset;
      ranges.push({ from, to: from + match[1].length });
    }

    return false;
  });

  if (ranges.length === 0) return false;

  const previousSelection = {
    from: editor.state.selection.from,
    to: editor.state.selection.to,
  };
  const chain = editor.chain();

  ranges.forEach((range) => chain.setTextSelection(range).setBold());
  chain.setTextSelection(previousSelection).focus().run();
  return true;
}

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
  const [value, setValue] = useState(defaultValue.trim() ? initialContent : '');
  const selectionRef = useRef<{ from: number; to: number } | null>(null);
  const syncEditorValue = (nextEditor: Editor, html = nextEditor.getHTML()) => {
    setValue(nextEditor.isEmpty ? '' : html);
    onContentChange?.();
  };
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      DescriptionEnterBehavior,
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
          'admin-description-editor min-h-[132px] cursor-text select-text px-3.5 py-3 text-sm leading-6 text-[#0b3e31] outline-none',
        role: 'textbox',
      },
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData('text/plain') ?? '';
        if (!/[\r\n]/.test(text)) return false;

        const slice = createPlainTextSlice(text, view.state.schema);
        if (!slice) return false;

        event.preventDefault();
        view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView());
        return true;
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      syncEditorValue(nextEditor);
    },
    onSelectionUpdate: ({ editor: nextEditor }) => {
      const { from, to } = nextEditor.state.selection;
      if (from !== to) selectionRef.current = { from, to };
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
    editor.commands.setContent(initialContent, { emitUpdate: true });
  }, [editor, initialContent]);

  const toggleBold = () => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const savedSelection = from === to && !editor.isFocused ? selectionRef.current : null;
    const chain = editor.chain().focus();

    if (savedSelection) chain.setTextSelection(savedSelection);
    chain.toggleBold().run();
    syncEditorValue(editor, editor.view.dom.innerHTML);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-[#0b5a45]/15 bg-[#f8f7f2] focus-within:border-[#0b5a45]/35 focus-within:ring-2 focus-within:ring-[#0b5a45]/10">
      <input type="hidden" name={name} value={value} />
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
          onPointerDown={(event) => event.preventDefault()}
          onClick={toggleBold}
          className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition ${
            editorState.boldActive
              ? 'border-[#0b5a45] bg-[#0b5a45] text-white'
              : 'border-[#0b5a45]/15 bg-white text-[#0b3e31] hover:bg-[#eef4ef]'
          }`}
        >
          <FiBold aria-hidden="true" />
          Жирный
        </button>
        <button
          type="button"
          title="Сделать жирными подписи перед двоеточием"
          aria-label="Подписи жирным"
          disabled={!editor}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => {
            if (editor && boldLineLabels(editor)) {
              syncEditorValue(editor, editor.view.dom.innerHTML);
            }
          }}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-[#0b5a45]/15 bg-white px-3 text-sm font-medium text-[#0b3e31] transition hover:bg-[#eef4ef]"
        >
          <FiType aria-hidden="true" />
          Подписи жирным
        </button>
        <span className="text-xs leading-5 text-[#6a7f76]">
          Выделите текст или оформите все подписи перед двоеточием
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
