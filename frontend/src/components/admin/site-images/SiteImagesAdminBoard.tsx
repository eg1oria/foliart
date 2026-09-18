'use client';

import { useState } from 'react';

import { adminCx } from '@/components/admin/adminStyles';
import {
  isSiteImageKey,
  siteImageGroupLabels,
  siteImageGroups,
  siteImageKeys,
  siteImageSlots,
  type SiteImageGroup,
  type SiteImageMap,
} from '@/lib/siteImages';

import SiteImageSlotCard from './SiteImageSlotCard';

export default function SiteImagesAdminBoard({
  canManage,
  highlightKey,
  images,
  locale,
  productPath,
}: {
  canManage: boolean;
  /** Slot the last upload or reset touched — its tab opens instead of «Главная». */
  highlightKey?: string;
  images: SiteImageMap;
  locale: string;
  /** Any product card, for the slots that are only visible there. */
  productPath?: string | null;
}) {
  const [group, setGroup] = useState<SiteImageGroup>(
    isSiteImageKey(highlightKey) ? siteImageSlots[highlightKey].group : 'home',
  );
  const visibleKeys = siteImageKeys.filter((key) => siteImageSlots[key].group === group);

  return (
    <div>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div
          className="inline-flex gap-1 rounded-xl bg-[#f1f4f0] p-1"
          role="tablist"
          aria-label="Страницы сайта">
          {siteImageGroups.map((item) => {
            const isActive = item === group;
            const keys = siteImageKeys.filter((key) => siteImageSlots[key].group === item);
            const replaced = keys.filter((key) => images[key]).length;

            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setGroup(item)}
                className={adminCx(
                  'inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition',
                  isActive
                    ? 'bg-white text-[#0b3e31] shadow-[0_1px_3px_rgba(11,62,49,0.12)]'
                    : 'text-[#567068] hover:text-[#0b3e31]',
                )}>
                {siteImageGroupLabels[item]}
                <span
                  className={adminCx(
                    'text-xs tabular-nums',
                    isActive ? 'text-[#7e9088]' : 'text-[#9aaaa3]',
                  )}>
                  {replaced ? `${replaced}/${keys.length}` : keys.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
        {visibleKeys.map((key) => (
          <SiteImageSlotCard
            key={key}
            canManage={canManage}
            highlighted={key === highlightKey}
            images={images}
            locale={locale}
            productPath={productPath}
            slotKey={key}
          />
        ))}
      </div>
    </div>
  );
}
