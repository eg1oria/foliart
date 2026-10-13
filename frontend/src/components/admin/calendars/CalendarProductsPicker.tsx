import type { Category, Product } from '@/lib/api';

import { adminCx, adminHintClassName, adminLabelClassName } from '../adminStyles';

function getCalendarProductsCopy(locale: string) {
  if (locale === 'en') {
    return {
      label: 'Catalog products',
      hint: 'Tick the products named on the calendar scheme. They appear under the calendar with links to the catalog and are shared by every language.',
    };
  }

  return {
    label: 'Препараты из каталога',
    hint: 'Отметьте препараты со схемы календаря. Они показываются под календарём со ссылками в каталог и общие для всех языков.',
  };
}

export default function CalendarProductsPicker({
  categories,
  locale,
  products,
  selectedIds,
}: {
  categories: Category[];
  locale: string;
  products: Product[];
  selectedIds: number[];
}) {
  const copy = getCalendarProductsCopy(locale);
  const selected = new Set(selectedIds);
  const groups = categories
    .map((category) => ({
      category,
      products: products.filter((product) => product.categoryId === category.id),
    }))
    .filter((group) => group.products.length > 0);

  return (
    <div className="rounded-lg border border-[#0b5a45]/10 bg-[#f7f9f6] p-4">
      <input type="hidden" name="productsField" value="1" />
      <p className={adminLabelClassName}>{copy.label}</p>
      <p className={adminCx('mt-2', adminHintClassName)}>{copy.hint}</p>

      <div className="mt-4 space-y-4">
        {groups.map(({ category, products: categoryProducts }) => (
          <fieldset key={category.id}>
            <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a7f76]">
              {category.name}
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {categoryProducts.map((product) => (
                <label
                  key={product.id}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[#0b5a45]/15 bg-white px-3 py-2 text-sm text-[#0b3e31] transition hover:border-[#0b5a45]/40 has-[:checked]:border-[#0b5a45] has-[:checked]:bg-[#e6f1ec]">
                  <input
                    name="productIds"
                    type="checkbox"
                    value={product.id}
                    defaultChecked={selected.has(product.id)}
                    className="h-4 w-4 accent-[#0b5a45]"
                  />
                  {product.name}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  );
}
