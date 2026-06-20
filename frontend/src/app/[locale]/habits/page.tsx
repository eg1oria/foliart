'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useLocale } from 'next-intl';
import {
  HABITS_CHANGED_EVENT,
  HABITS_STORAGE_KEY,
  getHabitDays,
  getTodayDateValue,
  parseStoredHabits,
  type Habit,
} from '@/lib/habits';

const copy = {
  ru: {
    name: 'привычка',
    empty: 'пока пусто',
    add: 'Добавить привычку',
    remove: 'Удалить привычку',
    daysShort: 'дн',
    daysLong: 'дней без срыва',
    close: 'закрыть',
    details: 'Подробности привычки',
  },
  en: {
    name: 'habit',
    empty: 'nothing here yet',
    add: 'Add habit',
    remove: 'Remove habit',
    daysShort: 'days',
    daysLong: 'days on track',
    close: 'close',
    details: 'Habit details',
  },
  fr: {
    name: 'habitude',
    empty: 'rien pour le moment',
    add: 'Ajouter une habitude',
    remove: "Supprimer l'habitude",
    daysShort: 'j',
    daysLong: 'jours sans interruption',
    close: 'fermer',
    details: "Détails de l'habitude",
  },
  es: {
    name: 'hábito',
    empty: 'todavía no hay nada',
    add: 'Añadir hábito',
    remove: 'Eliminar hábito',
    daysShort: 'días',
    daysLong: 'días sin interrupción',
    close: 'cerrar',
    details: 'Detalles del hábito',
  },
} as const;

function readHabitsSnapshot() {
  try {
    return window.localStorage.getItem(HABITS_STORAGE_KEY) ?? '[]';
  } catch {
    return '[]';
  }
}

function subscribeToHabits(callback: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === HABITS_STORAGE_KEY) callback();
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener(HABITS_CHANGED_EVENT, callback);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(HABITS_CHANGED_EVENT, callback);
  };
}

function saveHabits(habits: Habit[]) {
  try {
    window.localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits));
    window.dispatchEvent(new Event(HABITS_CHANGED_EVENT));
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

export default function HabitsPage() {
  const locale = useLocale() as keyof typeof copy;
  const t = copy[locale] ?? copy.en;
  const rawHabits = useSyncExternalStore(subscribeToHabits, readHabitsSnapshot, () => '[]');
  const habits = useMemo(() => parseStoredHabits(rawHabits), [rawHabits]);
  const [nameInput, setNameInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const selected = habits.find((habit) => habit.id === selectedId) ?? null;
  const today = getTodayDateValue();

  useEffect(() => {
    if (!selected) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedId(null);
    };

    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selected]);

  const add = () => {
    const name = nameInput.trim();
    if (!name || !dateInput || dateInput > today) return;

    const next = [
      ...habits,
      {
        id: crypto.randomUUID(),
        name,
        dateVal: dateInput,
      },
    ].sort((left, right) => getHabitDays(right.dateVal) - getHabitDays(left.dateVal));

    saveHabits(next);
    setNameInput('');
    setDateInput('');
  };

  const remove = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    saveHabits(habits.filter((habit) => habit.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <main className="flex min-h-dvh flex-col items-center px-5 pb-8 pt-40 md:pt-60">
      <div className="mb-14 flex w-full max-w-sm flex-col gap-4">
        <label>
          <span className="sr-only">{t.name}</span>
          <input
            className="w-full border-b border-gray-300 bg-transparent py-3 text-base outline-none focus:border-[#0b5a45]"
            type="text"
            placeholder={t.name}
            value={nameInput}
            onChange={(event) => setNameInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') document.getElementById('habit-date')?.focus();
            }}
            autoComplete="off"
          />
        </label>
        <div className="flex items-center gap-3">
          <label className="flex-1">
            <span className="sr-only">{t.add}</span>
            <input
              id="habit-date"
              className="w-full border-b border-gray-300 bg-transparent py-3 text-base outline-none focus:border-[#0b5a45]"
              type="date"
              max={today}
              value={dateInput}
              onChange={(event) => setDateInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') add();
              }}
            />
          </label>
          <button
            type="button"
            onClick={add}
            disabled={!nameInput.trim() || !dateInput || dateInput > today}
            aria-label={t.add}
            className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-35"
          >
            +
          </button>
        </div>
      </div>

      <div className="w-full max-w-sm flex-1">
        {habits.length === 0 ? (
          <p className="py-8 text-center text-xs text-gray-400">{t.empty}</p>
        ) : null}
        {habits.map((habit) => (
          <div
            key={habit.id}
            className="flex w-full items-center justify-between border-b border-gray-100 py-4 text-left transition-opacity active:opacity-50"
            role="button"
            tabIndex={0}
            onClick={() => setSelectedId(habit.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') setSelectedId(habit.id);
            }}
          >
            <span className="mr-4 min-w-0 flex-1 truncate text-sm text-gray-500">{habit.name}</span>
            <span className="text-2xl font-medium tabular-nums">
              {getHabitDays(habit.dateVal)}
              <span className="ml-1 text-xs font-normal text-gray-400">{t.daysShort}</span>
            </span>
            <button
              type="button"
              onClick={(event) => remove(event, habit.id)}
              aria-label={t.remove}
              className="ml-4 flex h-8 w-8 items-center justify-center text-base text-gray-300 hover:text-red-500"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {selected ? (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/20"
          role="dialog"
          aria-modal="true"
          aria-label={t.details}
          onMouseDown={() => setSelectedId(null)}
        >
          <div
            className="flex w-full flex-col items-center rounded-t-3xl bg-white px-8 pb-10 pt-3"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-8 h-1 w-10 rounded-full bg-gray-200" />
            <p className="mb-2 text-xs text-gray-400">{selected.name}</p>
            <div className="mb-2 text-7xl font-medium leading-none tracking-tight">
              {getHabitDays(selected.dateVal)}
            </div>
            <p className="mb-10 text-sm text-gray-400">{t.daysLong}</p>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setSelectedId(null)}
              className="w-full rounded-2xl bg-gray-100 py-4 text-sm text-gray-500 transition-colors hover:bg-gray-200"
            >
              {t.close}
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
