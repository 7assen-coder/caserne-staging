/** Compact border-left KPI used by ops list modules (Phase 30). */
export default function OpsStatCard({ label, value, hint, icon: Icon, accent = 'navy' }) {
  const accents = {
    navy: 'border-l-navy bg-white',
    green: 'border-l-emerald-600 bg-emerald-50/40',
    emerald: 'border-l-emerald-600 bg-emerald-50/40',
    amber: 'border-l-amber-500 bg-amber-50/40',
    slate: 'border-l-slate-400 bg-slate-50/60',
    red: 'border-l-red-500 bg-red-50/40',
    sky: 'border-l-sky-500 bg-sky-50/40',
    rose: 'border-l-rose-500 bg-rose-50/40',
  };
  return (
    <div
      className={`flex min-h-[5.5rem] flex-col justify-between rounded-xl border border-light-gray border-l-4 px-4 py-3.5 shadow-sm ${accents[accent] ?? accents.navy}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        {Icon ? <Icon size={16} className="shrink-0 text-slate-400" aria-hidden /> : null}
      </div>
      <p className="font-serif text-3xl font-semibold tabular-nums leading-none text-navy">{value}</p>
      {hint ? <p className="text-[11px] text-slate-500">{hint}</p> : <span className="h-4" aria-hidden />}
    </div>
  );
}
