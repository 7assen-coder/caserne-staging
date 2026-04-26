export default function AppTopBar() {
  const now = new Date();
  const opts = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
  const dateStr = now.toLocaleDateString('fr-FR', opts);

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-light-gray bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 md:px-8 md:text-sm">
      <span className="min-w-0 truncate uppercase tracking-[0.14em] text-slate-700">
        Direction de la scolarité · Administration
      </span>
      <span className="shrink-0 tabular-nums text-slate-500">{dateStr}</span>
    </div>
  );
}
