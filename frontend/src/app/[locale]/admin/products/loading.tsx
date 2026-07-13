export default function AdminProductsLoading() {
  return (
    <main className="min-h-screen bg-[#f3f5f1] px-4 pb-10 pt-28 text-[#0b3e31] sm:px-6 md:pt-56 lg:px-8">
      <div className="mx-auto max-w-[1500px] animate-pulse">
        <div className="rounded-xl border border-[#0b5a45]/8 bg-white p-5 sm:p-7">
          <div className="h-4 w-28 rounded bg-[#dfe8e1]" />
          <div className="mt-4 h-9 w-72 max-w-full rounded bg-[#d7e2da]" />
          <div className="mt-4 h-4 w-full max-w-2xl rounded bg-[#e8eee9]" />
          <div className="mt-6 flex gap-2">
            <div className="h-10 w-28 rounded-lg bg-[#dfe8e1]" />
            <div className="h-10 w-28 rounded-lg bg-[#dfe8e1]" />
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-24 rounded-lg bg-white" />
          ))}
        </div>
        <div className="mt-5 rounded-xl border border-[#0b5a45]/8 bg-white p-5">
          <div className="h-11 w-full rounded-lg bg-[#edf2ee]" />
          <div className="mt-5 space-y-3">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-16 rounded-lg bg-[#f2f5f2]" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
