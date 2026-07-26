import { describe, expect, it } from 'vitest';
import {
  flattenUiMessages,
  getBundledUiMessages,
  getUiMessagePathId,
  mergeUiMessages,
  parseUiMessagesApiResponse,
  rebuildUiMessages,
  resolveUiMessages,
} from './uiMessages';

describe('UI messages documents', () => {
  it('merges nested objects and arrays without changing their structure', () => {
    const bundled = {
      Home: {
        title: 'Bundled title',
        cards: [{ label: 'First' }, { label: 'Second' }],
      },
    };
    const merged = mergeUiMessages(bundled, {
      Home: {
        title: 'Saved title',
        cards: [{ label: 'Saved first' }],
        unknown: 'ignored',
      },
      Extra: { value: 'ignored' },
    });

    expect(merged).toEqual({
      Home: {
        title: 'Saved title',
        cards: [{ label: 'Saved first' }, { label: 'Second' }],
      },
    });
  });

  it('ignores wrong override types and supplements newly bundled keys', () => {
    expect(
      mergeUiMessages(
        { Home: { title: 'Title', newKey: 'New default' } },
        { Home: { title: 42 } },
      ),
    ).toEqual({ Home: { title: 'Title', newKey: 'New default' } });
  });

  it('flattens and safely rebuilds only string leaves', () => {
    const bundled = {
      Home: { title: 'Title', cards: ['One', 'Two'] },
    };
    const entries = flattenUiMessages(bundled);
    const title = entries.find((entry) => entry.key === 'Home.title');
    const rebuilt = rebuildUiMessages(bundled, {
      [getUiMessagePathId(title?.path ?? [])]: 'Changed',
    });

    expect(entries.map((entry) => entry.key)).toEqual([
      'Home.title',
      'Home.cards.0',
      'Home.cards.1',
    ]);
    expect(rebuilt).toEqual({
      Home: { title: 'Changed', cards: ['One', 'Two'] },
    });
  });

  it('falls back to bundled messages for an unavailable backend', () => {
    expect(resolveUiMessages('en', null)).toEqual(
      getBundledUiMessages('en'),
    );
  });

  it('rejects malformed backend responses before resolving fallback', () => {
    expect(
      parseUiMessagesApiResponse(
        {
          locale: 'en',
          messages: { Home: { title: false } },
          revision: 2,
          updatedAt: null,
        },
        'en',
      ),
    ).toBeNull();
    expect(
      parseUiMessagesApiResponse(
        {
          locale: 'ru',
          messages: null,
          revision: 0,
          updatedAt: null,
        },
        'en',
      ),
    ).toBeNull();
  });
});
