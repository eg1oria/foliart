'use client';

import { Link } from '@/i18n/routing';
import { useEffect, useId, useRef, useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import { HiOutlineSquares2X2 } from 'react-icons/hi2';
import { PiArrowBendLeftUpFill } from 'react-icons/pi';
type CategoryDropdownItem = {
  count: number;
  href: string;
  id: number;
  isCurrent: boolean;
  name: string;
};

type CategoryDropdownProps = {
  backHref: string;
  backLabel: string;
  items: CategoryDropdownItem[];
  label: string;
};

export default function CategoryDropdown({
  backHref,
  backLabel,
  items,
  label,
}: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        className={`flex w-full items-center justify-between gap-4 border px-5 py-4 text-left text-[1rem] font-medium transition-[background-color,color,border-radius,box-shadow] duration-300 ${
          isOpen
            ? 'rounded-b-none rounded-t-[4px] border-[#ecece6] bg-[#f3f3f1] text-[#111111]'
            : 'rounded-[4px] border-transparent bg-[#0b4d3c] text-white hover:bg-[#0a4436]'
        }`}>
        <span className="flex items-center gap-4">
          <HiOutlineSquares2X2 className="shrink-0 text-[1.5rem]" />
          <span>{label}</span>
        </span>
        <FiChevronDown
          className={`shrink-0 text-lg transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity,transform] duration-300 ease-out ${
          isOpen
            ? 'grid-rows-[1fr] opacity-100 translate-y-0'
            : 'pointer-events-none grid-rows-[0fr] opacity-0 -translate-y-2'
        } md:absolute md:left-0 md:top-full md:z-30 md:w-full`}
        aria-hidden={!isOpen}>
        <div className="overflow-hidden">
          <div
            id={menuId}
            className="overflow-hidden rounded-b-[4px] border border-t-0 border-[#ecece6] bg-[#f3f3f1] shadow-[0_24px_55px_-35px_rgba(17,17,17,0.5)]">
            <ul role="menu">
              {items.map((item, index) => {
                if (item.isCurrent) {
                  return (
                    <li key={item.id} role="none" className="bg-[#ececeb]">
                      <div
                        role="menuitem"
                        aria-current="page"
                        className="flex items-start justify-between gap-4 border-l-4 border-[#0b5a45] px-5 py-4">
                        <span className="text-[0.90rem] leading-8 text-[#111111]">{item.name}</span>
                        <span className="shrink-0 pt-1 text-sm text-[#b6b6b2]">{item.count}</span>
                      </div>
                    </li>
                  );
                }

                return (
                  <li
                    key={item.id}
                    role="none"
                    className={index === 0 ? '' : 'border-t border-[#e6e4df]'}>
                    <Link
                      href={item.href}
                      role="menuitem"
                      onClick={() => setIsOpen(false)}
                      tabIndex={isOpen ? 0 : -1}
                      className="flex items-start justify-between border-l-3 border-[#e6e4df] gap-4 px-5 py-4 text-[#4685d4] transition hover:text-[#0b4d3c]">
                      <span className="text-[0.90rem]  leading-8">{item.name}</span>
                      <span className="shrink-0 pt-1 text-sm text-[#b6b6b2]">{item.count}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-[#e6e4df] px-5 py-4 border-l-3 border-[#e6e4df]">
              <Link
                href={backHref}
                onClick={() => setIsOpen(false)}
                tabIndex={isOpen ? 0 : -1}
                className="inline-flex items-center gap-3 text-[1rem] text-[#838380] transition hover:text-[#0b5a45]">
                <PiArrowBendLeftUpFill className="shrink-0 text-[1.1rem]" />
                <span>{backLabel}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
