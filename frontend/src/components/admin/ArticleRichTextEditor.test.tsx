// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const editorMock = vi.hoisted(() => {
  let html = '';
  let options: {
    content?: string;
    onCreate?: (args: { editor: FakeEditor }) => void;
    onUpdate?: (args: { editor: FakeEditor }) => void;
  } = {};

  type ImageAttributes = {
    alt?: string;
    src: string;
  };

  type FakeEditor = typeof editor;

  let pendingImage: ImageAttributes | null = null;

  const chain = {
    focus: () => chain,
    setImage: (attributes: ImageAttributes) => {
      pendingImage = attributes;
      return chain;
    },
    run: () => {
      if (pendingImage) {
        const alt = pendingImage.alt ? ` alt="${pendingImage.alt}"` : '';
        html += `<img src="${pendingImage.src}"${alt} />`;
        pendingImage = null;
        options.onUpdate?.({ editor });
      }

      return true;
    },
  };

  const editor = {
    chain: () => chain,
    commands: {
      setContent: (content: string) => {
        html = content;
      },
    },
    getAttributes: () => ({}),
    getHTML: () => html,
    isActive: () => false,
    get isEmpty() {
      return !html;
    },
    view: {
      dom: document.createElement('div'),
    },
  };

  return {
    editor,
    initialize(nextOptions: typeof options) {
      options = nextOptions;

      if (!html) {
        html = nextOptions.content ?? '';
      }
    },
    reset() {
      html = '';
      options = {};
      pendingImage = null;
    },
  };
});

vi.mock('@tiptap/react', () => ({
  EditorContent: () => <div data-testid="editor" />,
  useEditor: (options: Parameters<typeof editorMock.initialize>[0]) => {
    editorMock.initialize(options);
    return editorMock.editor;
  },
  useEditorState: () => null,
}));

vi.mock('@tiptap/starter-kit', () => ({
  default: {
    configure: () => ({}),
  },
}));

vi.mock('@tiptap/extension-image', () => ({
  default: {
    configure: () => ({}),
  },
}));

vi.mock('@tiptap/extension-link', () => ({
  default: {
    configure: () => ({}),
  },
}));

vi.mock('@tiptap/extension-underline', () => ({
  default: {},
}));

import ArticleRichTextEditor from './ArticleRichTextEditor';

const uploadedImageUrl =
  '/media/articles/content/1782295647400-7347a834-ed81-4c90-8e24-a7e286ebaa6d.webp';

describe('ArticleRichTextEditor image uploads', () => {
  let container: HTMLDivElement;
  let form: HTMLFormElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    editorMock.reset();
    container = document.createElement('div');
    form = document.createElement('form');
    container.append(form);
    document.body.append(container);
    root = createRoot(form);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  function renderEditor() {
    act(() => {
      root.render(
        <ArticleRichTextEditor
          name="content"
          locale="ru"
          defaultValue="<p>До изображения</p>"
          placeholder="Текст статьи"
        />,
      );
    });
  }

  function selectImage(file = new File(['image'], 'leaf.png', { type: 'image/png' })) {
    const input = form.querySelector<HTMLInputElement>('input[type="file"]');

    if (!input) {
      throw new Error('Image input was not rendered');
    }

    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [file],
    });

    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  it('keeps the uploaded image in FormData after React rerenders', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ url: uploadedImageUrl }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    renderEditor();

    await act(async () => {
      selectImage();
      await Promise.resolve();
      await Promise.resolve();
    });

    const content = String(new FormData(form).get('content'));

    expect(content).toContain(`<img src="${uploadedImageUrl}" alt="leaf" />`);
  });

  it('blocks form submission while an image is uploading', async () => {
    let finishUpload: ((response: Response) => void) | undefined;
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          finishUpload = resolve;
        }),
    );
    renderEditor();

    await act(async () => {
      selectImage();
      await Promise.resolve();
    });

    const submitEvent = new SubmitEvent('submit', {
      bubbles: true,
      cancelable: true,
    });
    let submitResult = true;

    act(() => {
      submitResult = form.dispatchEvent(submitEvent);
    });

    expect(submitResult).toBe(false);
    expect(submitEvent.defaultPrevented).toBe(true);
    expect(form.getAttribute('aria-busy')).toBe('true');

    await act(async () => {
      finishUpload?.(
        new Response(JSON.stringify({ url: uploadedImageUrl }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(form.hasAttribute('aria-busy')).toBe(false);
    act(() => {
      submitResult = form.dispatchEvent(
        new SubmitEvent('submit', {
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    expect(submitResult).toBe(true);
  });

  it('shows the backend error and keeps the previous article HTML', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Image conversion failed' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }),
    );
    renderEditor();

    await act(async () => {
      selectImage();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(form.querySelector('[role="alert"]')?.textContent).toBe(
      'Image conversion failed',
    );
    expect(new FormData(form).get('content')).toBe('<p>До изображения</p>');
  });
});
