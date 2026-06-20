'use client';

import { useLocale } from 'next-intl';

const copy = {
  ru: {
    title: 'Не удалось загрузить страницу',
    description: 'Проверьте соединение и попробуйте еще раз.',
    retry: 'Повторить',
    home: 'На главную',
  },
  en: {
    title: 'The page could not be loaded',
    description: 'Check your connection and try again.',
    retry: 'Try again',
    home: 'Go home',
  },
  fr: {
    title: 'Impossible de charger la page',
    description: 'Vérifiez votre connexion et réessayez.',
    retry: 'Réessayer',
    home: "Retour à l'accueil",
  },
  es: {
    title: 'No se pudo cargar la página',
    description: 'Compruebe su conexión e inténtelo de nuevo.',
    retry: 'Reintentar',
    home: 'Ir al inicio',
  },
} as const;

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useLocale() as keyof typeof copy;
  const t = copy[locale] ?? copy.en;

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 pb-20 pt-40 text-center md:pt-60">
      <div className="max-w-lg">
        <h1 className="text-3xl font-semibold text-[#10283d]">{t.title}</h1>
        <p className="mt-4 leading-7 text-[#5f726b]">{t.description}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-[#0b5a45] px-6 py-3 font-medium text-white hover:bg-[#074031]"
          >
            {t.retry}
          </button>
          <a
            href={`/${locale}`}
            className="rounded-full border border-[#0b5a45]/20 px-6 py-3 font-medium text-[#0b5a45] hover:bg-[#eef4ef]"
          >
            {t.home}
          </a>
        </div>
      </div>
    </main>
  );
}
