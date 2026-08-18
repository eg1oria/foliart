'use client';

import { useEffect } from 'react';
import { RxCross1 } from 'react-icons/rx';
import { useTranslations } from 'next-intl';
import SearchField from './SearchField';

type SearchOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const t = useTranslations('Search');

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('pageTitle')}
      className={`fixed inset-0 z-[120] transition-opacity duration-200 ${
        isOpen ? 'visible opacity-100' : 'invisible opacity-0'
      }`}>
      <button
        type="button"
        aria-label={t('closeLabel')}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-[#062a21]/80 backdrop-blur-[2px]"
      />

      <div className="site-gutter relative flex w-full justify-center pt-24 md:pt-32">
        <div className="w-full max-w-3xl">
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-lg font-medium text-white md:text-xl">{t('pageTitle')}</p>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('closeLabel')}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
              <RxCross1 size={18} aria-hidden="true" />
            </button>
          </div>

          {isOpen ? <SearchField variant="overlay" autoFocus onNavigate={onClose} /> : null}

          <p className="mt-3 text-sm text-white/70">{t('pageSubtitle')}</p>
        </div>
      </div>
    </div>
  );
}
