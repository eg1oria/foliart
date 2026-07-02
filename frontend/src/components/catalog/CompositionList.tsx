'use client';

import { useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import type { CompositionItem } from '@/lib/catalog';

const initialVisibleCount = 5;

type CompositionListProps = {
  items: CompositionItem[];
  locale: string;
  productId: number;
};

function getToggleLabel(locale: string, isExpanded: boolean) {
  if (locale === 'fr') {
    return isExpanded ? 'Masquer' : 'Tout afficher';
  }

  if (locale === 'es') {
    return isExpanded ? 'Ocultar' : 'Mostrar todo';
  }

  if (locale === 'en') {
    return isExpanded ? 'Hide' : 'Show all';
  }

  return isExpanded ? 'Скрыть' : 'Показать всё';
}

export default function CompositionList({ items, locale, productId }: CompositionListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasHiddenItems = items.length > initialVisibleCount;
  const visibleItems = isExpanded ? items : items.slice(0, initialVisibleCount);

  return (
    <div>
      <ul className="space-y-4">
        {visibleItems.map((item, index) => (
          <li
            key={`${productId}-composition-${index}`}
            className="flex items-end gap-4 text-[1.05rem] leading-6 text-[#4b5563]">
            <span className="shrink-0 max-w-[45%] break-words">{item.label}</span>
            <span className="mb-[0.32rem] h-px min-w-4 flex-1 bg-[radial-gradient(circle,_#9ca3af_1px,_transparent_1.2px)] bg-[length:6px_1px] bg-repeat-x" />
            <span className="shrink-0 font-semibold text-[#374151]">{item.value || '-'}</span>
          </li>
        ))}
      </ul>

      {hasHiddenItems && (
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((currentValue) => !currentValue)}
          className="mt-2 inline-flex min-h-10 items-center gap-2 underline underline-offset-4 cursor-pointer hover:no-underline text-sm font-medium text-[#4492d4] ">
          <span>{getToggleLabel(locale, isExpanded)}</span>
          <FiChevronDown
            size={16}
            className={`shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>
      )}
    </div>
  );
}
