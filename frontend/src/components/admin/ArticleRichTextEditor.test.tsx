// @vitest-environment jsdom

import { act, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const editorMock = vi.hoisted(() => {
  let options: { onUpdate?: (args: { editor: typeof editor }) => void } = {};
  let nodes: Array<{ type: string; attrs?: Record<string, unknown>; nodeSize: number }> = [];
  let actions: Array<{ name: string; value?: unknown }> = [];
  const notify = () => options.onUpdate?.({ editor });
  const commands = {
    setContent: (
      document: {
        content?: Array<{ type: string; attrs?: Record<string, unknown> }>;
      },
    ) => {
      nodes = (document.content ?? []).map((node) => ({
        ...node,
        nodeSize: 1,
      }));
      return true;
    },
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
    toggleHeading: (value: unknown) => {
      actions.push({ name: 'heading', value });
      return chain;
    },
    toggleBold: () => {
      actions.push({ name: 'bold' });
      return chain;
    },
    toggleItalic: () => {
      actions.push({ name: 'italic' });
      return chain;
    },
    toggleUnderline: () => {
      actions.push({ name: 'underline' });
      return chain;
    },
    toggleBulletList: () => {
      actions.push({ name: 'bulletList' });
      return chain;
    },
    toggleOrderedList: () => {
      actions.push({ name: 'orderedList' });
      return chain;
    },
    toggleBlockquote: () => {
      actions.push({ name: 'blockquote' });
      return chain;
    },
    extendMarkRange: () => chain,
    unsetLink: () => {
      actions.push({ name: 'unsetLink' });
      return chain;
    },
    setLink: (value: unknown) => {
      actions.push({ name: 'setLink', value });
      return chain;
    },
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
    getActions() {
      return actions;
    },
    reset() {
      options = {};
      nodes = [];
      actions = [];
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

describe('ArticleRichTextEditor', () => {
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
    vi.restoreAllMocks();
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

  it('runs every formatting action through a normal click', () => {
    render();
    const labels = [
      'H2',
      'H3',
      'H4',
      'Жирный',
      'Курсив',
      'Подчёркнутый',
      'Маркированный список',
      'Нумерованный список',
      'Цитата',
    ];

    act(() => {
      labels.forEach((label) => {
        container.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!.click();
      });
    });

    expect(editorMock.getActions()).toEqual([
      { name: 'heading', value: { level: 2 } },
      { name: 'heading', value: { level: 3 } },
      { name: 'heading', value: { level: 4 } },
      { name: 'bold' },
      { name: 'italic' },
      { name: 'underline' },
      { name: 'bulletList' },
      { name: 'orderedList' },
      { name: 'blockquote' },
    ]);
  });

  it('keeps the editor selection on pointer interaction with the toolbar', () => {
    render();
    const button = container.querySelector<HTMLButtonElement>('[aria-label="Жирный"]')!;
    const pointerDown = new Event('pointerdown', { bubbles: true, cancelable: true });

    expect(button.dispatchEvent(pointerDown)).toBe(false);
    expect(pointerDown.defaultPrevented).toBe(true);
  });

  it('normalizes a domain link and removes a link when the prompt is empty', () => {
    const prompt = vi.spyOn(window, 'prompt');
    prompt.mockReturnValueOnce('example.com/article').mockReturnValueOnce('  ');
    render();
    const linkButton = container.querySelector<HTMLButtonElement>('[aria-label="Ссылка"]')!;

    act(() => linkButton.click());
    act(() => linkButton.click());

    expect(editorMock.getActions()).toContainEqual({
      name: 'setLink',
      value: { href: 'https://example.com/article' },
    });
    expect(editorMock.getActions()).toContainEqual({ name: 'unsetLink' });
  });

  it('rejects unsafe links without changing the document', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('javascript:alert(1)');
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    render();

    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Ссылка"]')!.click());

    expect(alert).toHaveBeenCalledWith('Небезопасный URL.');
    expect(editorMock.getActions()).toEqual([]);
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
    expect(container.querySelector('[aria-label="Повторить загрузку"]')).not.toBeNull();
    expect(editorMock.editor.getJSON().content?.[0].type).toBe('imageUpload');
  });

  it('rejects unsupported files before saving or uploading', async () => {
    const props = render();
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [new File(['code'], 'unsafe.svg', { type: 'image/svg+xml' })],
    });

    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'Поддерживаются только JPG, PNG, WEBP и GIF.',
    );
    expect(container.querySelector('[aria-label="Повторить загрузку"]')).toBeNull();
    expect(props.onBeforeUpload).not.toHaveBeenCalled();
    expect(props.onUpload).not.toHaveBeenCalled();
    expect(editorMock.editor.getJSON().content).not.toContainEqual(
      expect.objectContaining({ type: 'imageUpload' }),
    );
  });

  it('prevents duplicate retries for the same failed upload', async () => {
    const onUpload = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce({
        id: 'd87ed781-53f8-4a20-90f3-927c75ef7842',
        publicUrl: '/media/articles/media/d87ed781-53f8-4a20-90f3-927c75ef7842/original.webp',
        previewUrl: '/media/articles/media/d87ed781-53f8-4a20-90f3-927c75ef7842/preview.webp',
        width: 800,
        height: 600,
      });
    render({ onUpload });
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
    const retry = container.querySelector<HTMLButtonElement>(
      '[aria-label="Повторить загрузку"]',
    )!;

    await act(async () => {
      retry.click();
      retry.click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onUpload).toHaveBeenCalledTimes(2);
    expect(editorMock.editor.getJSON().content?.[0].type).toBe('image');
  });
});
