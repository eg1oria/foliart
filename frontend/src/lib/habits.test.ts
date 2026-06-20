import { describe, expect, it } from 'vitest';
import { getHabitDays, getTodayDateValue, isValidHabitDate, parseStoredHabits } from './habits';

const now = new Date(2026, 5, 20, 23, 30);

describe('habits storage', () => {
  it('migrates valid legacy records and drops malformed values', () => {
    const habits = parseStoredHabits(
      JSON.stringify([
        { name: '  Reading  ', dateVal: '2026-06-10' },
        { name: '', dateVal: '2026-06-10' },
        { name: 'Future', dateVal: '2026-06-21' },
      ]),
      now,
    );

    expect(habits).toEqual([
      {
        id: 'legacy-0-2026-06-10-Reading',
        name: 'Reading',
        dateVal: '2026-06-10',
      },
    ]);
  });

  it('recovers from invalid JSON', () => {
    expect(parseStoredHabits('{broken', now)).toEqual([]);
  });
});

describe('habit dates', () => {
  it('counts calendar days without depending on time or DST length', () => {
    expect(getHabitDays('2026-06-10', now)).toBe(10);
    expect(getTodayDateValue(now)).toBe('2026-06-20');
  });

  it('rejects impossible and future dates', () => {
    expect(isValidHabitDate('2026-02-30', now)).toBe(false);
    expect(isValidHabitDate('2026-06-21', now)).toBe(false);
  });
});
