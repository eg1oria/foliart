'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { useTranslations } from 'next-intl';

const SearchOverlay = dynamic(() => import('./SearchOverlay'), { ssr: false });

type SearchTriggerProps = {
  className?: string;
  iconSize?: number;
};

export default function SearchTrigger({ className = '', iconSize = 20 }: SearchTriggerProps) {
  const t = useTranslations('Search');
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  const open = () => {
    setHasOpened(true);
    setIsOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={t('triggerLabel')}
        title={t('triggerLabel')}
        className={`flex cursor-pointer items-center justify-center text-white transition-colors hover:text-white/75 ${className}`}>
        <FiSearch size={iconSize} aria-hidden="true" />
      </button>

      {hasOpened ? <SearchOverlay isOpen={isOpen} onClose={() => setIsOpen(false)} /> : null}
    </>
  );
}
