'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export default function ContactForm() {
  const [agreed, setAgreed] = useState(true);
  const t = useTranslations('ContactForm');

  return (
    <div className="bg-[#f5f0e8] p-8 max-w-sm w-full">
      <form className="flex flex-col gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder={t('namePlaceholder')}
            className="w-full bg-white border border-gray-300 border-2 px-4 py-3 text-sm outline-none focus:border-gray-400 pr-6"
          />
          <span className="absolute right-3 top-3 text-red-500 text-sm">*</span>
        </div>

        <div>
          <input
            type="tel"
            placeholder={t('phonePlaceholder')}
            className="w-full bg-white border border-gray-300 border-2 px-4 py-3 text-sm outline-none focus:border-gray-400"
          />
        </div>

        <div className="relative">
          <textarea
            placeholder={t('commentPlaceholder')}
            rows={4}
            className="w-full bg-white border border-gray-300 px-4 border-2 py-3 text-sm outline-none focus:border-gray-400 resize-none pr-6"
          />
          <span className="absolute right-3 top-3 text-red-500 text-sm">*</span>
        </div>

        <button
          type="submit"
          className="w-full bg-[#2d5a3d] hover:bg-[#244a32] text-white rounded-full py-3 text-base font-medium transition-colors mt-2">
          {t('submit')}
        </button>

        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 accent-[#2d5a3d] shrink-0"
          />
          <span className="text-xs text-gray-600 leading-snug">
            {t('consent')}{' '}
            <Link href="/privacy" className="text-blue-500 hover:underline">
              {t('consentLink')}
            </Link>
          </span>
        </label>
      </form>
    </div>
  );
}
