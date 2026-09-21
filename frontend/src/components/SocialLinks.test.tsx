// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { maxSocialLinksInRow, type SocialLinkItem } from '@/lib/socialLinks';

import SocialLinks from './SocialLinks';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const icons = ['vk', 'ok', 'facebook', 'telegram', 'instagram', 'youtube', 'whatsapp', 'tiktok'];

function makeLinks(count: number): SocialLinkItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: String(index + 1),
    label: `Network ${index + 1}`,
    href: `https://example.com/${index + 1}`,
    icon: icons[index % icons.length] as SocialLinkItem['icon'],
  }));
}

let container: HTMLDivElement;
let root: Root;

function render(node: React.ReactNode) {
  act(() => {
    root.render(node);
  });
}

function badgeLinks() {
  return Array.from(container.querySelectorAll('nav > a'));
}

function moreButton() {
  return container.querySelector('nav button');
}

function panelLinks() {
  return Array.from(container.querySelectorAll('nav ul a'));
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

describe('SocialLinks', () => {
  it('renders nothing without links', () => {
    render(<SocialLinks links={[]} maxVisible={maxSocialLinksInRow} />);

    expect(container.querySelector('nav')).toBeNull();
  });

  it('keeps every badge in the row when the set fills it exactly', () => {
    render(
      <SocialLinks links={makeLinks(maxSocialLinksInRow)} maxVisible={maxSocialLinksInRow} />,
    );

    expect(badgeLinks()).toHaveLength(maxSocialLinksInRow);
    expect(moreButton()).toBeNull();
  });

  it('gives the last slot to the button as soon as one badge does not fit', () => {
    render(
      <SocialLinks links={makeLinks(maxSocialLinksInRow + 1)} maxVisible={maxSocialLinksInRow} />,
    );

    // Five links stay whole; the sixth turns the row into four plus the button.
    expect(badgeLinks()).toHaveLength(maxSocialLinksInRow - 1);
    expect(moreButton()?.textContent).toBe('+2');
  });

  it('keeps every badge in the row when no limit is given', () => {
    render(<SocialLinks links={makeLinks(8)} />);

    expect(badgeLinks()).toHaveLength(8);
    expect(moreButton()).toBeNull();
  });

  it('draws the badges that fit and counts the rest on the button', () => {
    render(
      <SocialLinks
        links={makeLinks(8)}
        maxVisible={maxSocialLinksInRow}
        moreLabel="Ещё соцсети"
      />,
    );

    expect(badgeLinks()).toHaveLength(4);
    expect(badgeLinks().map((link) => link.getAttribute('title'))).toEqual([
      'Network 1',
      'Network 2',
      'Network 3',
      'Network 4',
    ]);

    const button = moreButton();
    expect(button?.textContent).toBe('+4');
    expect(button?.getAttribute('aria-label')).toBe('Ещё соцсети (4)');
    expect(button?.getAttribute('aria-expanded')).toBe('false');
    // The panel stays out of the DOM until it is opened.
    expect(panelLinks()).toHaveLength(0);
  });

  it('opens the hidden links in a dropdown and closes it again', () => {
    render(<SocialLinks links={makeLinks(8)} maxVisible={maxSocialLinksInRow} />);

    act(() => {
      moreButton()?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(moreButton()?.getAttribute('aria-expanded')).toBe('true');
    expect(panelLinks().map((link) => link.textContent)).toEqual([
      'Network 5',
      'Network 6',
      'Network 7',
      'Network 8',
    ]);
    expect(panelLinks()[0].getAttribute('href')).toBe('https://example.com/5');
    expect(panelLinks()[0].getAttribute('target')).toBe('_blank');
    expect(panelLinks()[0].getAttribute('rel')).toBe('noopener noreferrer');

    act(() => {
      moreButton()?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(panelLinks()).toHaveLength(0);
  });

  it('closes the dropdown on a click outside and on Escape', () => {
    render(<SocialLinks links={makeLinks(8)} maxVisible={maxSocialLinksInRow} />);

    const open = () =>
      act(() => {
        moreButton()?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

    open();
    act(() => {
      // jsdom has no PointerEvent constructor; the handler only reads the target.
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    expect(panelLinks()).toHaveLength(0);

    // A pointer landing on the dropdown itself leaves it open.
    open();
    act(() => {
      panelLinks()[0].dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    expect(panelLinks()).toHaveLength(4);

    open();
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(panelLinks()).toHaveLength(0);
  });

  it('closes the dropdown when one of its links is followed', () => {
    const clicked: string[] = [];
    render(
      <SocialLinks
        links={makeLinks(8)}
        maxVisible={maxSocialLinksInRow}
        onLinkClick={() => clicked.push('closed')}
      />,
    );

    act(() => {
      moreButton()?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    act(() => {
      panelLinks()[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(clicked).toEqual(['closed']);
    expect(panelLinks()).toHaveLength(0);
  });

  it('drops the dropdown when the set shrinks back under the limit', () => {
    render(<SocialLinks links={makeLinks(8)} maxVisible={maxSocialLinksInRow} />);

    act(() => {
      moreButton()?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(panelLinks()).toHaveLength(4);

    render(<SocialLinks links={makeLinks(3)} maxVisible={maxSocialLinksInRow} />);

    expect(moreButton()).toBeNull();
    expect(badgeLinks()).toHaveLength(3);
  });
});
