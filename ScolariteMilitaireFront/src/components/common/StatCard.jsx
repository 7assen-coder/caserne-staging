import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ icon: Icon, label, value, trend, accent = 'navy', hint }) {
  const accents = {
    navy: {
      bg: 'bg-navy-50',
      icon: 'text-navy',
      ring: 'ring-navy-100',
    },
    gold: {
      bg: 'bg-gold-100',
      icon: 'text-gold-700',
      ring: 'ring-gold-200',
    },
    green: {
      bg: 'bg-emerald-50',
      icon: 'text-brand-green',
      ring: 'ring-emerald-100',
    },
    red: {
      bg: 'bg-red-50',
      icon: 'text-brand-red',
      ring: 'ring-red-100',
    },
  };
  const a = accents[accent] ?? accents.navy;

  return (
    <div className="card card-hover flex h-full flex-col p-6 md:p-8 relative overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        {Icon && (
          <div
            className={`w-14 h-14 md:w-16 md:h-16 rounded-xl ${a.bg} ring-1 ${a.ring} ${a.icon} grid place-items-center shrink-0
              dark:bg-slate-700 dark:ring-2 dark:ring-gold/45 dark:text-white`}
          >
            <Icon size={28} strokeWidth={2} />
          </div>
        )}

        {trend && (
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
              trend.positive
                ? 'bg-emerald-50 text-brand-green'
                : 'bg-red-50 text-brand-red'
            }`}
          >
            {trend.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trend.value}
          </span>
        )}
      </div>

      <div className="mt-5">
        <p className="text-sm md:text-base font-medium uppercase tracking-wide text-text-light dark:text-slate-400">
          {label}
        </p>
        <p className="text-4xl md:text-5xl font-serif font-semibold text-navy-900 dark:text-white mt-1.5 leading-none">
          {value}
        </p>
        {hint && (
          <p className="text-sm text-text-light dark:text-slate-400 mt-2">{hint}</p>
        )}
      </div>
    </div>
  );
}
