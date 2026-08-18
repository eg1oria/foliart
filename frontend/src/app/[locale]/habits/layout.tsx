import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { internalToolsEnabled } from '@/lib/internalTools';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function HabitsLayout({ children }: { children: React.ReactNode }) {
  if (!internalToolsEnabled) {
    notFound();
  }

  return children;
}
