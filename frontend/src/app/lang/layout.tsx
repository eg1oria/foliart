import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';

import { internalToolsEnabled } from '@/lib/internalTools';

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
  if (!internalToolsEnabled) {
    notFound();
  }

  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
