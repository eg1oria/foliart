// @vitest-environment jsdom

import { act, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const editorMock = vi.hoisted(() => {
  let options: { onUpdate?: (args: { editor: typeof editor }) => void } = {};
  let nodes: Array<{ type: string; attrs?: Record<string, unknown>; nodeSize: number }> = [];
  const notify = () => options.onUpdate?.({ editor });
  const commands = {
    insertContentAt: (position: number | { from: number; to: number }, content: { type: string; attrs?: Record<string, unknown> }) => {
      if (typeof position === 'object') {
        const index = nodes.findIndex((node) => node.attrs?.uploadId === nodes[position.from]?.attrs?.uploadId);
        if (index >= 0) nodes[index] = { ...content, nodeSize: 1 };
        else nodes[0] = { ...content, nodeSize: 1 };
      } else {
        nodes.splice(Math.min(position, nodes.length), 0, { ...content, nodeSize: 1 });
      }
      notify();
      return true;
    },
    deleteRange: () => true,
  };
  const chain = {
    focus: () => chain,
    toggleHeading: () => chain,
    toggleBold: () => chain,
    toggleItalic: () => chain,
    toggleUnderline: () => chain,
    toggleBulletList: () => chain,
    toggleOrderedList: () => chain,
    toggleBlockquote: () => chain,
    extendMarkRange: () => chain,
    unsetLink: () => chain,
    setLink: () => chain,
    run: () => true,
  };
  const editor = {
    chain: () => chain,
    commands,
    getAttributes: () => ({}),
    getJSON: () => ({
      type: 'doc',
      content: nodes.map((node) => ({ type: node.type, attrs: node.attrs })),
    }),
    isActive: () => false,
    isEmpty: false,
    state: {
      selection: { from: 0 },
      doc: {
        descendants: (callback: (node: { type: { name: string }; attrs: Record<string, unknown>; nodeSize: number }, pos: number) => boolean) => {
          nodes.forEach((node, index) => callback({ type: { name: node.type }, attrs: node.attrs ?? {}, nodeSize: 1 }, index));
        },
      },
    },
  };
  return {
    editor,
    initialize(next: typeof options) {
      options = next;
    },
    reset() {
      options = {};
      nodes = [];
    },
  };
});

vi.mock('@tiptap/react', () => ({
  EditorContent: () => <div data-testid="editor" />,
  useEditor: (options: Parameters<typeof editorMock.initialize>[0]) => {
    editorMock.initialize(options);
    return editorMock.editor;
  },
  useEditorState: ({ selector }: { selector: (args: { editor: typeof editorMock.editor }) => unknown }) =>
    selector({ editor: editorMock.editor }),
}));
vi.mock('@tiptap/extension-file-handler', () => ({ default: { configure: () => ({}) } }));
vi.mock('../../lib/articleContent', () => ({
  createArticleExtensions: () => [],
}));

import ArticleRichTextEditor from './ArticleRichTextEditor';

describe('ArticleRichTextEditor JSON uploads', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    editorMock.reset();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render(overrides: Partial<ComponentProps<typeof ArticleRichTextEditor>> = {}) {
    const props = {
      defaultDocument: { type: 'doc', content: [{ type: 'paragraph' }] },
      locale: 'ru',
      placeholder: 'Текст',
      onChange: vi.fn(),
      onBeforeUpload: vi.fn().mockResolvedValue(undefined),
      onUpload: vi.fn().mockResolvedValue({
        id: 'd87ed781-53f8-4a20-90f3-927c75ef7842',
        publicUrl: '/media/articles/media/d87ed781-53f8-4a20-90f3-927c75ef7842/original.webp',
        previewUrl: '/media/articles/media/d87ed781-53f8-4a20-90f3-927c75ef7842/preview.webp',
        width: 800,
        height: 600,
      }),
      ...overrides,
    };
    act(() => root.render(<ArticleRichTextEditor {...props} />));
    return props;
  }

  it('exposes H2 through H4 controls', () => {
    render();
    expect(container.querySelector('[aria-label="H2"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="H3"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="H4"]')).not.toBeNull();
  });

  it('saves a positional placeholder before uploading and replaces it with an image node', async () => {
    const props = render();
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [new File(['image'], 'leaf.png', { type: 'image/png' })],
    });
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(props.onBeforeUpload).toHaveBeenCalled();
    expect(props.onUpload).toHaveBeenCalled();
    expect(editorMock.editor.getJSON().content?.[0].type).toBe('image');
    expect(editorMock.editor.getJSON().content?.[0].attrs?.mediaId).toBe(
      'd87ed781-53f8-4a20-90f3-927c75ef7842',
    );
  });

  it('keeps the placeholder and offers retry after an upload error', async () => {
    render({ onUpload: vi.fn().mockRejectedValue(new Error('Network unavailable')) });
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [new File(['image'], 'leaf.png', { type: 'image/png' })],
    });
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Network unavailable');
    expect(container.querySelector('[aria-label="Retry"]')).not.toBeNull();
    expect(editorMock.editor.getJSON().content?.[0].type).toBe('imageUpload');
  });
});
