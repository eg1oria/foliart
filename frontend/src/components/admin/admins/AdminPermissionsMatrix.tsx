'use client';

import { FiAlertTriangle, FiCheckCircle, FiEye, FiSlash } from 'react-icons/fi';

import {
  adminAccessLevelLabels,
  adminAccessLevels,
  adminSectionLabels,
  adminSections,
  createAdminPermissions,
  type AdminAccessLevel,
  type AdminPermissions,
} from '@/lib/adminPermissions';

import { adminCx, adminHintClassName, adminSecondaryButtonClassName } from '../adminStyles';

const levelHints: Record<AdminAccessLevel, string> = {
  none: 'Раздел скрыт из меню.',
  view: 'Списки видны, кнопки изменения скрыты.',
  manage: 'Создание, изменение и удаление.',
};

const presets = [
  { icon: FiCheckCircle, label: 'Всё — полный доступ', level: 'manage' },
  { icon: FiEye, label: 'Всё — только просмотр', level: 'view' },
  { icon: FiSlash, label: 'Снять доступ', level: 'none' },
] as const satisfies ReadonlyArray<{
  icon: typeof FiEye;
  label: string;
  level: AdminAccessLevel;
}>;

export default function AdminPermissionsMatrix({
  onChange,
  permissions,
}: {
  onChange: (permissions: AdminPermissions) => void;
  permissions: AdminPermissions;
}) {
  const grantedCount = adminSections.filter(
    (section) => permissions[section] !== 'none',
  ).length;

  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">Доступ к разделам админки</legend>

      <div className="flex flex-wrap items-center gap-2">
        {presets.map((preset) => (
          <button
            key={preset.level}
            type="button"
            onClick={() => onChange(createAdminPermissions(preset.level))}
            className={adminCx(
              adminSecondaryButtonClassName,
              'h-9 min-h-9 gap-1.5 px-3 text-xs',
            )}>
            <preset.icon aria-hidden="true" />
            {preset.label}
          </button>
        ))}

        <span className={adminCx(adminHintClassName, 'ml-auto')}>
          Выдано разделов: {grantedCount} из {adminSections.length}
        </span>
      </div>

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
                  checked={permissions[section] === level}
                  onChange={() => onChange({ ...permissions, [section]: level })}
                  className="h-4 w-4 accent-[#0b5a45]"
                />
                <span>{adminAccessLevelLabels[level]}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      {grantedCount === 0 ? (
        <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          <FiAlertTriangle aria-hidden="true" className="mt-1 shrink-0" />
          Ни один раздел не выдан: администратор сможет войти, но увидит только страницу
          «Нет доступа».
        </p>
      ) : null}

      <p className={adminHintClassName}>
        «Только просмотр» оставляет списки доступными, но запрещает любые изменения — в том
        числе через прямые запросы.
      </p>
    </fieldset>
  );
}
