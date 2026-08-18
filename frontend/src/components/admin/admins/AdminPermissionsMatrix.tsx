'use client';

import {
  adminAccessLevelLabels,
  adminAccessLevels,
  adminSectionLabels,
  adminSections,
  type AdminPermissions,
} from '@/lib/adminPermissions';

import { adminCx, adminHintClassName } from '../adminStyles';

const levelHints: Record<(typeof adminAccessLevels)[number], string> = {
  none: 'Раздел скрыт из меню.',
  view: 'Списки видны, кнопки изменения скрыты.',
  manage: 'Создание, изменение и удаление.',
};

export default function AdminPermissionsMatrix({
  permissions,
}: {
  permissions: AdminPermissions;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">Доступ к разделам админки</legend>

      {adminSections.map((section) => (
        <div
          key={section}
          className="rounded-lg border border-[#0b5a45]/10 bg-white p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
          <p className="text-sm font-semibold text-[#0b3e31]">{adminSectionLabels[section]}</p>

          <div className="mt-3 grid gap-2 sm:mt-0 sm:grid-cols-3 sm:gap-2">
            {adminAccessLevels.map((level) => (
              <label
                key={level}
                title={levelHints[level]}
                className={adminCx(
                  'flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-[#0b5a45]/12 bg-[#f7f9f6] px-3 py-2 text-sm font-semibold text-[#0b3e31] transition',
                  'hover:border-[#0b5a45]/25 has-[:checked]:border-[#0b5a45] has-[:checked]:bg-[#0b5a45] has-[:checked]:text-white',
                )}>
                <input
                  type="radio"
                  name={`permission_${section}`}
                  value={level}
                  defaultChecked={permissions[section] === level}
                  className="h-4 w-4 accent-[#0b5a45]"
                />
                <span>{adminAccessLevelLabels[level]}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <p className={adminHintClassName}>
        «Только просмотр» оставляет списки доступными, но запрещает любые изменения — в том
        числе через прямые запросы.
      </p>
    </fieldset>
  );
}
