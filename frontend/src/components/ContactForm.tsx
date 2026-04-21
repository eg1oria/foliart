'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function ContactForm() {
  const [agreed, setAgreed] = useState(true);

  return (
    <div className="bg-[#f5f0e8] p-8 max-w-sm w-full">
      <form className="flex flex-col gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Имя"
            className="w-full bg-white border border-gray-300 border-2 px-4 py-3 text-sm outline-none focus:border-gray-400 pr-6"
          />
          <span className="absolute right-3 top-3 text-red-500 text-sm">*</span>
        </div>

        <div>
          <input
            type="tel"
            placeholder="Телефон"
            className="w-full bg-white border border-gray-300 border-2 px-4 py-3 text-sm outline-none focus:border-gray-400"
          />
        </div>

        <div className="relative">
          <textarea
            placeholder="Комментарий"
            rows={4}
            className="w-full bg-white border border-gray-300 px-4 border-2 py-3 text-sm outline-none focus:border-gray-400 resize-none pr-6"
          />
          <span className="absolute right-3 top-3 text-red-500 text-sm">*</span>
        </div>

        <button
          type="submit"
          className="w-full bg-[#2d5a3d] hover:bg-[#244a32] text-white rounded-full py-3 text-base font-medium transition-colors mt-2">
          Отправить
        </button>

        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 accent-[#2d5a3d] shrink-0"
          />
          <span className="text-xs text-gray-600 leading-snug">
            Даю своё согласие на законную обработку персональных данных.{' '}
            <Link href="/privacy" className="text-blue-500 hover:underline">
              составлена в соответствии с требованиями Федерального закона от 27.07.2006. №152-ФЗ «О
              персональных данных»
            </Link>
          </span>
        </label>
      </form>
    </div>
  );
}
