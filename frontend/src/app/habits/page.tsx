'use client';

import { useState, useEffect } from 'react';

interface Habit {
  name: string;
  dateVal: string;
}

function getDays(dateVal: string) {
  const ms = Date.now() - new Date(dateVal).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

export default function HabitsPage() {
  const [mounted, setMounted] = useState(false);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [nameInput, setNameInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [selected, setSelected] = useState<Habit | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('habits');
      if (saved) setHabits(JSON.parse(saved));
    } catch {}
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('habits', JSON.stringify(habits));
  }, [habits, mounted]);

  const add = () => {
    if (!nameInput || !dateInput) return;
    const next = [...habits, { name: nameInput, dateVal: dateInput }];
    next.sort((a, b) => getDays(b.dateVal) - getDays(a.dateVal));
    setHabits(next);
    setNameInput('');
    setDateInput('');
  };

  const remove = (e: React.MouseEvent, i: number) => {
    e.stopPropagation();
    setHabits(habits.filter((_, idx) => idx !== i));
  };

  const h = selected;
  const days = h ? getDays(h.dateVal) : 0;

  if (!mounted) return null;

  return (
    <div className="flex flex-col items-center min-h-dvh px-5 pt-14 pb-10">
      <div className="flex flex-col gap-4 w-full max-w-sm mb-14">
        <input
          className="bg-transparent border-b border-gray-300 py-3 text-base outline-none"
          type="text"
          placeholder="привычка"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && document.getElementById('date')?.focus()}
          autoComplete="off"
          autoCapitalize="none"
        />
        <div className="flex gap-3 items-center">
          <input
            id="date"
            className="bg-transparent border-b border-gray-300 py-3 text-base outline-none flex-1"
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <button
            onClick={add}
            className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 active:bg-gray-100 text-2xl transition-colors">
            +
          </button>
        </div>
      </div>

      <div className="w-full max-w-sm flex-1">
        {habits.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-8">пока пусто</p>
        )}
        {habits.map((habit, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-4 border-b border-gray-100 active:opacity-50 transition-opacity"
            onClick={() => setSelected(habit)}>
            <span className="text-sm text-gray-500 flex-1 truncate mr-4">{habit.name}</span>
            <span className="text-2xl font-medium tabular-nums">
              {getDays(habit.dateVal)}
              <span className="text-xs font-normal text-gray-400 ml-1">дн</span>
            </span>
            <button
              onClick={(e) => remove(e, i)}
              className="ml-4 w-8 h-8 flex items-center justify-center text-gray-300 active:text-red-400 text-base">
              ✕
            </button>
          </div>
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 bg-black/20 flex items-end justify-center z-50"
          onClick={() => setSelected(null)}>
          <div
            className="bg-white flex flex-col items-center rounded-t-3xl px-8 pt-3 pb-10 w-full"
            onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-gray-200 mb-8" />
            <p className="text-xs text-gray-400 mb-2">{h!.name}</p>
            <div className="text-7xl font-medium tracking-tight leading-none mb-2">{days}</div>
            <p className="text-sm text-gray-400 mb-10">дней без срыва</p>
            <button
              onClick={() => setSelected(null)}
              className="w-full bg-gray-100 active:bg-gray-200 rounded-2xl py-4 text-sm text-gray-500 transition-colors">
              закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
