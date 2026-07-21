import { getProducts, publicApiFetchOptions } from '@/lib/api';

// Страница выводит СПИСОК всех товаров на французском (contentLocale = 'fr'):
// для каждого товара — название, описание, состав, преимущества и регламент применения.
//
// Разместите файл, например, по пути:
//   app/[locale]/produits/page.tsx
// или под любым другим сегментом — компонент от params не зависит.

export default async function ProductsFrenchListPage() {
  const products = await getProducts(undefined, 'fr', publicApiFetchOptions, 'fr');

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 pt-30">
      <h1 className="mb-8 text-2xl font-semibold text-[#0b5a45]">Nos produits</h1>

      {products.length === 0 ? (
        <p className="italic text-[#8a978f]">Aucun produit disponible pour le moment.</p>
      ) : (
        <div className="space-y-12">
          {products.map((product) => {
            const sections = [
              { title: 'Description', content: product.description },
              { title: 'Composition', content: product.composition },
              { title: 'Avantages', content: product.advantages },
              { title: "Modalités d'utilisation", content: product.application },
            ];

            return (
              <article
                key={product.id}
                className="rounded-lg border border-[#0b5a45]/10 bg-white p-6">
                <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start">
                  <h2 className="text-xl font-semibold text-[#0b5a45]">{product.name}</h2>
                </div>

                <div className="space-y-5">
                  {sections.map((section) => (
                    <div key={section.title}>
                      <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#0b5a45]/70">
                        {section.title}
                      </h3>
                      {section.content ? (
                        <p className="whitespace-pre-line text-[#3b4a45] leading-relaxed">
                          {section.content}
                        </p>
                      ) : (
                        <p className="italic text-[#8a978f]">
                          Cette section n&apos;est pas encore renseignée en français.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
