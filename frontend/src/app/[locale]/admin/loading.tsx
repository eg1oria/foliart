// Every admin page is dynamic (the session cookie is read per request), and
// Next skips prefetching a dynamic route that has no loading boundary — so
// without this file a sidebar click sat dead until the RSC round-trip landed.
// Rendered into the admin layout's content slot, so the sidebar and top bar
// stay on screen. Sections with a tailored skeleton (products) keep their own.
export default function AdminSectionLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-72 max-w-full rounded bg-[#d7e2da]" />
      <div className="mt-4 h-4 w-full max-w-2xl rounded bg-[#e8eee9]" />

      <div className="mt-6 rounded-lg border border-[#0b5a45]/10 bg-white p-4 sm:p-5 lg:p-6">
        <div className="h-4 w-24 rounded bg-[#dfe8e1]" />
        <div className="mt-3 h-7 w-48 max-w-full rounded bg-[#d7e2da]" />
        <div className="mt-6 space-y-3">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-16 rounded-lg bg-[#f2f5f2]" />
          ))}
        </div>
      </div>
    </div>
  );
}
