import type { Metadata, Viewport } from 'next';

import '../globals.css';

export const metadata: Metadata = {
  title: 'Проверка переводов | Foliart',
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function LanguageComparisonLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
