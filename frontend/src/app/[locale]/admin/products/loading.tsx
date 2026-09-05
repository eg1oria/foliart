// Rendered into the admin layout's content slot, so the sidebar and top bar
// stay on screen while the products page streams in.
export default function AdminProductsLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-72 max-w-full rounded bg-[#d7e2da]" />
      <div className="mt-4 h-4 w-full max-w-2xl rounded bg-[#e8eee9]" />

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-24 rounded-lg border border-[#0b5a45]/8 bg-white" />
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-[#0b5a45]/10 bg-white p-4 sm:p-5 lg:p-6">
        <div className="h-4 w-24 rounded bg-[#dfe8e1]" />
        <div className="mt-3 h-7 w-48 max-w-full rounded bg-[#d7e2da]" />
        <div className="mt-6 h-11 w-full rounded-lg bg-[#edf2ee]" />
        <div className="mt-5 space-y-3">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-16 rounded-lg bg-[#f2f5f2]" />
          ))}
        </div>
      </div>
    </div>
  );
}
