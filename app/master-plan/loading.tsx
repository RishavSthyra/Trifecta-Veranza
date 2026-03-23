export default function Loading() {
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#f5f7fb] text-zinc-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.14),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_28%)]" />
      <div className="relative z-10 flex h-full items-end px-6 pb-10 pt-24 md:px-10 md:pb-14">
        <div className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.4em] text-zinc-500 md:text-xs">
            Trifecta Veranza
          </p>
          <h1 className="mt-3 text-3xl font-light uppercase tracking-[0.14em] md:text-5xl">
            Master Plan
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-zinc-600 md:text-base">
            Preparing the interactive masterplan view.
          </p>
        </div>
      </div>
    </div>
  );
}
