'use client';

import { useMemo, useState } from 'react';
import { FiSearch } from 'react-icons/fi';

import enMessages from '../../../messages/en.json';
import esMessages from '../../../messages/es.json';
import frMessages from '../../../messages/fr.json';
import ruMessages from '../../../messages/ru.json';

const translations = {
  en: enMessages,
  fr: frMessages,
  es: esMessages,
} as const;

const languageNames = {
  en: 'Английский',
  fr: 'Французский',
  es: 'Испанский',
} as const;

type Language = keyof typeof translations;

const languages = Object.keys(languageNames) as Language[];

type TranslationEntry = {
  key: string;
  section: string;
  russian: string;
  translation: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function flattenMessages(value: unknown, path = '', result = new Map<string, string>()) {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    result.set(path, String(value ?? ''));
    return result;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      flattenMessages(item, path ? `${path}.${index}` : String(index), result);
    });

    return result;
  }

  if (typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      flattenMessages(item, path ? `${path}.${key}` : key, result);
    });
  }

  return result;
}

function getEntries(language: Language): TranslationEntry[] {
  const russian = flattenMessages(ruMessages);
  const translated = flattenMessages(translations[language]);

  return Array.from(russian, ([key, russianText]) => ({
    key,
    section: key.split('.')[0] || 'other',
    russian: russianText,
    translation: translated.get(key) ?? '',
  }));
}

export default function LanguageComparisonPage() {
  const [language, setLanguage] = useState<Language>('en');
  const [section, setSection] = useState('all');
  const [query, setQuery] = useState('');

  const entries = useMemo(() => getEntries(language), [language]);

  const sections = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.section))).sort(),
    [entries],
  );

  const missingCount = useMemo(
    () => entries.filter((entry) => !entry.translation.trim()).length,
    [entries],
  );

  const visibleEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return entries.filter((entry) => {
      const isSameSection = section === 'all' || entry.section === section;

      if (!isSameSection) return false;
      if (!normalizedQuery) return true;

      return [entry.key, entry.russian, entry.translation].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    });
  }, [entries, query, section]);

  return (
    <main className="min-h-screen bg-stone-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white px-4 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Foliart translations
            </div>

            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Проверка переводов
            </h1>
          </div>
        </div>
      </section>

      <section className="sticky top-0 z-10 border-b border-slate-200 bg-stone-50/90 px-4 py-4 backdrop-blur sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-3 lg:grid-cols-[1fr_minmax(280px,420px)_220px] lg:items-center">
          <div className="flex flex-wrap gap-2" aria-label="Язык перевода">
            {languages.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLanguage(code)}
                aria-pressed={language === code}
                className={cx(
                  'rounded-full border px-4 py-2 text-sm font-medium transition',
                  language === code
                    ? 'border-slate-950 bg-slate-950 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400',
                )}>
                {code.toUpperCase()} · {languageNames[code]}
              </button>
            ))}
          </div>

          <label className="relative block">
            <span className="sr-only">Поиск по переводам</span>

            <FiSearch
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Найти текст или ключ"
              className="min-h-11 w-full rounded-full border border-slate-200 bg-white py-2 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
            />
          </label>

          <label className="block">
            <span className="sr-only">Раздел переводов</span>

            <select
              value={section}
              onChange={(event) => setSection(event.target.value)}
              className="min-h-11 w-full rounded-full border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5">
              <option value="all">Все разделы</option>

              {sections.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-8 lg:px-12 lg:py-10">
        <div className="mb-4 flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Показано <span className="font-semibold text-slate-900">{visibleEntries.length}</span>{' '}
            из {entries.length} строк
          </p>

          <p>
            Без перевода:{' '}
            <span className={cx('font-semibold', missingCount ? 'text-red-600' : 'text-slate-900')}>
              {missingCount}
            </span>
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-2 border-b border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 md:grid">
            <div className="border-r border-slate-200 px-6 py-4">Русский оригинал</div>
            <div className="px-6 py-4">{languageNames[language]}</div>
          </div>

          {visibleEntries.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {visibleEntries.map((entry) => {
                const isMissing = !entry.translation.trim();

                return (
                  <article key={entry.key} className="grid md:grid-cols-2">
                    <div className="border-slate-200 px-5 py-5 md:border-r md:px-6">
                      <p className="mb-2 break-all font-mono text-xs text-slate-400">{entry.key}</p>

                      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-950 sm:text-base">
                        {entry.russian}
                      </p>
                    </div>

                    <div className="bg-slate-50/70 px-5 py-5 md:bg-white md:px-6">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 md:hidden">
                        {languageNames[language]}
                      </p>

                      <p
                        className={cx(
                          'whitespace-pre-wrap text-sm leading-7 sm:text-base',
                          isMissing ? 'font-medium text-red-600' : 'text-slate-700',
                        )}>
                        {isMissing ? 'Перевод отсутствует' : entry.translation}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-16 text-center text-sm text-slate-500">
              По вашему запросу ничего не найдено.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
