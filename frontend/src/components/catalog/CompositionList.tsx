import type { CompositionItem } from '@/lib/catalog';

type CompositionListProps = {
  items: CompositionItem[];
  productId: number;
};

export default function CompositionList({ items, productId }: CompositionListProps) {
  return (
    <ul className="space-y-4">
      {items.map((item, index) => (
        <li
          key={`${productId}-composition-${index}`}
          className="flex items-end gap-4 text-[1.05rem] leading-6 text-[#4b5563]">
          <span className="shrink-0 max-w-[45%] break-words">{item.label}</span>
          <span className="mb-[0.32rem] h-px min-w-4 flex-1 bg-[radial-gradient(circle,_#9ca3af_1px,_transparent_1.2px)] bg-[length:6px_1px] bg-repeat-x" />
          <span className="shrink-0 font-semibold text-[#374151]">{item.value || '-'}</span>
        </li>
      ))}
    </ul>
  );
}
