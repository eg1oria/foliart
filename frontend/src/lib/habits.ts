export const HABITS_STORAGE_KEY = 'habits';
export const HABITS_CHANGED_EVENT = 'foliart:habits-changed';

export type Habit = {
  id: string;
  name: string;
  dateVal: string;
};

const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

function getUtcDay(value: string) {
  const match = value.match(datePattern);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utcDay = Date.UTC(year, month - 1, day);
  const parsed = new Date(utcDay);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return utcDay;
}

export function getTodayDateValue(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getHabitDays(dateVal: string, now = new Date()) {
  const startDay = getUtcDay(dateVal);
  const today = getUtcDay(getTodayDateValue(now));

  if (startDay === null || today === null) return 0;

  return Math.max(0, Math.floor((today - startDay) / 86_400_000));
}

export function isValidHabitDate(dateVal: string, now = new Date()) {
  const day = getUtcDay(dateVal);
  const today = getUtcDay(getTodayDateValue(now));

  return day !== null && today !== null && day <= today;
}

export function parseStoredHabits(raw: string | null, now = new Date()): Habit[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((value, index): Habit | null => {
        if (!value || typeof value !== 'object') return null;

        const record = value as Record<string, unknown>;
        const name = typeof record.name === 'string' ? record.name.trim() : '';
        const dateVal = typeof record.dateVal === 'string' ? record.dateVal : '';

        if (!name || !isValidHabitDate(dateVal, now)) return null;

        const id =
          typeof record.id === 'string' && record.id.trim()
            ? record.id
            : `legacy-${index}-${dateVal}-${name}`;

        return { id, name, dateVal };
      })
      .filter((habit): habit is Habit => habit !== null)
      .sort((left, right) => getHabitDays(right.dateVal, now) - getHabitDays(left.dateVal, now));
  } catch {
    return [];
  }
}
