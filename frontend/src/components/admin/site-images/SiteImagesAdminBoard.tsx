'use client';

import { useState } from 'react';

import { adminCx } from '@/components/admin/adminStyles';
import {
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
  images,
  locale,
}: {
  canManage: boolean;
  images: SiteImageMap;
  locale: string;
}) {
  const [group, setGroup] = useState<SiteImageGroup>('home');
  const visibleKeys = siteImageKeys.filter((key) => siteImageSlots[key].group === group);

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Страницы сайта">
        {siteImageGroups.map((item) => {
          const isActive = item === group;

          return (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setGroup(item)}
              className={adminCx(
                'inline-flex min-h-9 cursor-pointer items-center rounded-lg border px-3 py-1.5 text-sm font-semibold transition',
                isActive
                  ? 'border-[#0b5a45] bg-[#0b5a45] text-white'
                  : 'border-[#0b5a45]/14 bg-white text-[#0b3e31] hover:border-[#0b5a45]/30 hover:bg-[#eef4ef]',
              )}>
              {siteImageGroupLabels[item]}
              <span className="ml-2 text-xs font-medium opacity-70">
                {siteImageKeys.filter((key) => siteImageSlots[key].group === item).length}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleKeys.map((key) => (
          <SiteImageSlotCard
            key={key}
            canManage={canManage}
            images={images}
            locale={locale}
            slotKey={key}
          />
        ))}
      </div>
    </div>
  );
}
