'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { socialIcons } from '@/lib/socialIcons';
import type { SocialLinkItem } from '@/lib/socialLinks';

type SocialLinksProps = {
  links: SocialLinkItem[];
  ariaLabel?: string;
  className?: string;
  linkClassName?: string;
  /**
   * How many badges stay in the row. The rest move into a dropdown opened by a
   * trailing `+N` button, so the header keeps its width whatever the admin
   * saves. Left out (or `0`) the whole set is drawn inline.
   */
  maxVisible?: number;
  /** Label for the `+N` button; the page passes a translated one. */
  moreLabel?: string;
  onLinkClick?: () => void;
};

const defaultNavClassName = 'flex items-center gap-2';
const defaultLinkClassName =
  'flex h-12 w-12 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:border-transparent hover:bg-[#074031] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

/** An icon badge falls back to its short text — one of the two always exists. */
function BadgeFace({
  icon,
  text,
  size,
}: {
  icon?: SocialLinkItem['icon'];
  text?: string;
  size: number;
}) {
  const Icon = icon ? socialIcons[icon] : undefined;

  if (Icon) {
    return <Icon size={size} aria-hidden="true" />;
  }

  return (
    <span aria-hidden="true" className="text-[14px] font-bold uppercase leading-none">
      {text}
    </span>
  );
}

export default function SocialLinks({
  links,
  ariaLabel = 'Foliart social links',
  className = defaultNavClassName,
  linkClassName = defaultLinkClassName,
  maxVisible = 0,
  moreLabel = 'More',
  onLinkClick,
}: SocialLinksProps) {
  const [isOverflowRequested, setIsOverflowRequested] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const isCollapsed = maxVisible > 0 && links.length > maxVisible;
  const visibleLinks = isCollapsed ? links.slice(0, maxVisible) : links;
  const overflowLinks = isCollapsed ? links.slice(maxVisible) : [];
  // Derived rather than stored: a set trimmed back below the limit takes the
  // button away, and a panel left open would have nothing left to close it.
  const isOverflowOpen = isOverflowRequested && isCollapsed;

  useEffect(() => {
    if (!isOverflowOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (overflowRef.current?.contains(event.target as Node)) return;
      setIsOverflowRequested(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsOverflowRequested(false);
      moreButtonRef.current?.focus();
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOverflowOpen]);

  if (links.length === 0) {
    return null;
  }

  const handleLinkClick = () => {
    setIsOverflowRequested(false);
    onLinkClick?.();
  };

  return (
    <nav aria-label={ariaLabel} className={className}>
      {visibleLinks.map(({ id, label, href, icon, text }) => (
        <a
          key={id}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Foliart ${label}`}
          title={label}
          onClick={handleLinkClick}
          className={linkClassName}>
          <BadgeFace icon={icon} text={text} size={20} />
        </a>
      ))}

      {isCollapsed ? (
        <div ref={overflowRef} className="relative">
          <button
            ref={moreButtonRef}
            type="button"
            aria-expanded={isOverflowOpen}
            aria-controls={isOverflowOpen ? panelId : undefined}
            aria-label={`${moreLabel} (${overflowLinks.length})`}
            title={moreLabel}
            onClick={() => setIsOverflowRequested((open) => !open)}
            className={`${linkClassName} cursor-pointer ${
              isOverflowOpen ? 'border-transparent bg-[#074031]' : ''
            }`}>
            <span aria-hidden="true" className="text-[14px] font-bold leading-none">
              +{overflowLinks.length}
            </span>
          </button>

          {isOverflowOpen ? (
            <ul
              id={panelId}
              className="absolute right-0 top-[calc(100%+0.6rem)] z-50 max-h-[min(70vh,24rem)] min-w-[13rem] overflow-y-auto overscroll-contain rounded-xl border border-white/15 bg-[#074031] py-1.5 shadow-[0_22px_38px_-18px_rgba(0,0,0,0.9)]">
              {overflowLinks.map(({ id, label, href, icon, text }) => (
                <li key={id}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Foliart ${label}`}
                    onClick={handleLinkClick}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white focus-visible:outline-none">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
                      <BadgeFace icon={icon} text={text} size={18} />
                    </span>
                    <span className="truncate">{label}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}
