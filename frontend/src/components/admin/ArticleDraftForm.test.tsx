// @vitest-environment jsdom

import { act, type AnchorHTMLAttributes, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => router }));

vi.mock('@/i18n/routing', () => ({
  Link: ({ children, href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <span data-image>{alt}</span>,
}));

// The real editor drags in the whole tiptap stack; this form's own state
// machine is what is under test.
vi.mock('./ArticleRichTextEditor', () => ({
  default: () => <div data-editor />,
}));

import ArticleDraftForm from './ArticleDraftForm';

type DraftPayload = {
  id: string;
  version: number;
  title: string;
  [key: string]: unknown;
};

type RequestLog = { method: string; url: string; body: Record<string, unknown> | null };

function draftFixture(overrides: Partial<DraftPayload> = {}): DraftPayload {
  return {
    id: 'draft-1',
    articleId: null,
    locale: 'ru',
    title: 'Заголовок',
    excerpt: 'Анонс',
    contentJson: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Текст' }] }],
    },
    publishedAt: '2026-07-14T00:00:00.000Z',
    coverMediaId: null,
    version: 3,
    imageLayoutRevision: 0,
    updatedAt: '2026-07-14T00:00:00.000Z',
    media: [],
    ...overrides,
  };
}

function reply(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function conflict(message = 'Article draft was changed in another session') {
  return reply({ message }, 409);
}

describe('ArticleDraftForm draft version recovery', () => {
  let container: HTMLDivElement;
  let root: Root;
  let requests: RequestLog[];
  // Keyed by "METHOD /path"; each entry is consumed in order, and the last one
  // repeats once the queue runs dry.
  let queues: Record<string, Response[]>;

  function route(key: string, ...responses: Response[]) {
    queues[key] = [...(queues[key] ?? []), ...responses];
  }

  function sent(method: string, url: string) {
    return requests.filter((item) => item.method === method && item.url === url);
  }

  function statusText() {
    return container.querySelector('[role="alert"], [role="status"]')?.textContent ?? '';
  }

  beforeEach(() => {
    router.replace.mockClear();
    router.refresh.mockClear();
    localStorage.clear();
    requests = [];
    queues = {};
    vi.stubGlobal('fetch', (input: string, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase();
      const body =
        typeof init?.body === 'string'
          ? (JSON.parse(init.body) as Record<string, unknown>)
          : null;
      requests.push({ method, url: input, body });
      const queue = queues[`${method} ${input}`];
      if (!queue?.length) throw new Error(`Unexpected request: ${method} ${input}`);
      return Promise.resolve(queue.length > 1 ? queue.shift()! : queue[0]);
    });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  async function render() {
    await act(async () => {
      root.render(<ArticleDraftForm contentLocale="ru" draftId="draft-1" locale="ru" />);
    });
  }

  function titleInput() {
    return container.querySelector<HTMLInputElement>('input[type="text"], input:not([type])')!;
  }

  async function type(value: string) {
    const input = titleInput();
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!;
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  // Clicking anywhere outside the focused field flushes a save, which is the
  // path the editor uses in practice.
  async function blurAway() {
    await act(async () => {
      titleInput().dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    });
  }

  function publishButton() {
    return [...container.querySelectorAll('button')].find((item) =>
      item.textContent?.includes('Опубликовать'),
    )!;
  }

  function clickPublish() {
    return act(async () => {
      publishButton().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  }

  it('rebases onto the server version after a conflict and saves', async () => {
    route('GET /admin-api/article-drafts/draft-1', reply(draftFixture()), reply(draftFixture({ version: 5 })));
    route(
      'PATCH /admin-api/article-drafts/draft-1',
      conflict(),
      reply(draftFixture({ version: 6, title: 'Новый заголовок' })),
    );
    await render();

    await type('Новый заголовок');
    await blurAway();

    const patches = sent('PATCH', '/admin-api/article-drafts/draft-1');
    expect(patches).toHaveLength(2);
    expect(patches[0].body).toMatchObject({ version: 3 });
    // The retry carries the freshly read version and the text still on screen.
    expect(patches[1].body).toMatchObject({ version: 5, title: 'Новый заголовок' });
    expect(sent('GET', '/admin-api/article-drafts/draft-1')).toHaveLength(2);
    expect(statusText()).toBe('Черновик сохранён');
  });

  it('reports a second conflict in Russian instead of the raw backend string', async () => {
    route('GET /admin-api/article-drafts/draft-1', reply(draftFixture()), reply(draftFixture({ version: 5 })));
    route('PATCH /admin-api/article-drafts/draft-1', conflict());
    await render();

    await type('Новый заголовок');
    await blurAway();

    expect(sent('PATCH', '/admin-api/article-drafts/draft-1')).toHaveLength(2);
    expect(statusText()).toBe(
      'Черновик изменён в другой вкладке или сессии. Обновите страницу, чтобы продолжить.',
    );
  });

  it('keeps autosaving after a conflict', async () => {
    vi.useFakeTimers();
    route('GET /admin-api/article-drafts/draft-1', reply(draftFixture()), reply(draftFixture({ version: 5 })));
    route('PATCH /admin-api/article-drafts/draft-1', conflict(), conflict(), reply(draftFixture({ version: 6 })));
    await render();

    await type('Новый заголовок');
    await blurAway();
    expect(sent('PATCH', '/admin-api/article-drafts/draft-1')).toHaveLength(2);

    // A 409 is a version problem, not bad content, so the interval keeps going.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(sent('PATCH', '/admin-api/article-drafts/draft-1').length).toBeGreaterThan(2);
    expect(statusText()).toBe('Черновик сохранён');
  });

  it('resyncs after a write whose outcome is unknown', async () => {
    route('GET /admin-api/article-drafts/draft-1', reply(draftFixture()), reply(draftFixture({ version: 9 })));
    route(
      'PATCH /admin-api/article-drafts/draft-1',
      reply({ message: 'Backend API is unavailable' }, 503),
      reply(draftFixture({ version: 10 })),
    );
    await render();

    await type('Новый заголовок');
    await blurAway();
    expect(statusText()).toBe('Сервер недоступен. Повторите попытку.');

    await type('Ещё правка');
    await blurAway();

    const patches = sent('PATCH', '/admin-api/article-drafts/draft-1');
    expect(patches).toHaveLength(2);
    // The aborted PATCH may have committed, so the next write re-reads first.
    expect(patches[1].body).toMatchObject({ version: 9 });
  });

  it('forces a resync when Retry is pressed', async () => {
    route('GET /admin-api/article-drafts/draft-1', reply(draftFixture()), reply(draftFixture({ version: 9 })));
    route(
      'PATCH /admin-api/article-drafts/draft-1',
      reply({ message: 'Backend API is unavailable' }, 503),
      reply(draftFixture({ version: 10 })),
    );
    await render();

    await type('Новый заголовок');
    await blurAway();

    const retry = [...container.querySelectorAll('button')].find(
      (item) => item.textContent === 'Повторить',
    )!;
    await act(async () => {
      retry.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(sent('GET', '/admin-api/article-drafts/draft-1')).toHaveLength(2);
    expect(sent('PATCH', '/admin-api/article-drafts/draft-1')[1].body).toMatchObject({
      version: 9,
    });
    expect(statusText()).toBe('Черновик сохранён');
  });

  it('still freezes autosave and blocks publishing when the content is rejected', async () => {
    route('GET /admin-api/article-drafts/draft-1', reply(draftFixture()));
    route('PATCH /admin-api/article-drafts/draft-1', reply({ message: 'Published date is invalid' }, 400));
    await render();

    await type('Новый заголовок');
    await blurAway();
    expect(statusText()).toBe('Некорректная дата публикации.');

    await clickPublish();
    expect(sent('POST', '/admin-api/article-drafts/draft-1/publish')).toHaveLength(0);
    expect(statusText()).toBe('Исправьте указанную ошибку черновика перед публикацией.');
  });

  it('publishes after one silent retry when the publish version is stale', async () => {
    route(
      'GET /admin-api/article-drafts/draft-1',
      reply(draftFixture()),
      reply(draftFixture({ version: 8 })),
    );
    route(
      'PATCH /admin-api/article-drafts/draft-1',
      reply(draftFixture({ version: 4 })),
      reply(draftFixture({ version: 9 })),
    );
    route(
      'POST /admin-api/article-drafts/draft-1/publish',
      conflict(),
      reply({ id: 42 }),
    );
    await render();

    await type('Новый заголовок');
    await clickPublish();

    const publishes = sent('POST', '/admin-api/article-drafts/draft-1/publish');
    expect(publishes).toHaveLength(2);
    expect(publishes[0].body).toMatchObject({ version: 4 });
    expect(publishes[1].body).toMatchObject({ version: 9 });
    expect(router.replace).toHaveBeenCalledWith(
      '/ru/admin/articles?status=updated&article=42&contentLocale=ru',
    );
  });

  it('does not retry a publish blocked by another language', async () => {
    route('GET /admin-api/article-drafts/draft-1', reply(draftFixture()));
    route('PATCH /admin-api/article-drafts/draft-1', reply(draftFixture({ version: 4 })));
    route(
      'POST /admin-api/article-drafts/draft-1/publish',
      conflict('Article images changed in another language. Reload the draft before publishing.'),
    );
    await render();

    await type('Новый заголовок');
    await clickPublish();

    expect(sent('POST', '/admin-api/article-drafts/draft-1/publish')).toHaveLength(1);
    expect(statusText()).toBe(
      'Изображения статьи изменились в другом языке. Обновите страницу перед публикацией.',
    );
  });

  it('keeps background autosaves out of the way while publishing', async () => {
    vi.useFakeTimers();
    let releasePublish: (value: Response) => void = () => {};
    route('GET /admin-api/article-drafts/draft-1', reply(draftFixture()));
    route('PATCH /admin-api/article-drafts/draft-1', reply(draftFixture({ version: 4 })));
    queues['POST /admin-api/article-drafts/draft-1/publish'] = [
      new Promise<Response>((resolve) => {
        releasePublish = resolve;
      }) as unknown as Response,
    ];
    await render();

    await type('Новый заголовок');
    // Let the publish's own save land so the publish POST is left in flight.
    act(() => {
      publishButton().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(sent('POST', '/admin-api/article-drafts/draft-1/publish')).toHaveLength(1);
    const patchesBefore = sent('PATCH', '/admin-api/article-drafts/draft-1').length;

    // Editing while "Публикация…" is showing, and the blur the Publish click
    // itself produces: a save landing here would bump the version out from
    // under the in-flight publish and make it 409.
    await type('Правка во время публикации');
    await blurAway();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(sent('PATCH', '/admin-api/article-drafts/draft-1')).toHaveLength(patchesBefore);

    await act(async () => {
      releasePublish(reply({ id: 42 }));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(router.replace).toHaveBeenCalled();
  });
});
