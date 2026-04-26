const TONES = {
  present: 'border-emerald-800 bg-emerald-950/55 text-emerald-300',
  absent: 'border-red-800 bg-red-950/50 text-red-300',
  en_attente: 'border-amber-700 bg-amber-950/45 text-amber-200',
  valide: 'border-emerald-800 bg-emerald-950/55 text-emerald-300',
  refuse: 'border-red-800 bg-red-950/50 text-red-300',
  permission: 'border-slate-600 bg-slate-800 text-slate-200',
  mission: 'border-slate-600 bg-slate-700 text-slate-100',
  medical: 'border-sky-800 bg-sky-950/50 text-sky-200',
  ok: 'border-emerald-800 bg-emerald-950/55 text-emerald-300',
  alerte: 'border-amber-700 bg-amber-950/45 text-amber-200',
  critique: 'border-red-800 bg-red-950/50 text-red-300',
  gold: 'border-gold-600 bg-gold-950/40 text-gold-300',
  navy: 'border-navy-600 bg-navy-900 text-slate-100',
  neutral: 'border-slate-600 bg-slate-700 text-slate-200',
};

export default function Badge({ tone = 'neutral', children, className = '', dot = false }) {
  const tone_ = TONES[tone] ?? TONES.neutral;
  const dotColors = {
    present: 'bg-brand-green',
    absent: 'bg-brand-red',
    en_attente: 'bg-amber-500',
    valide: 'bg-brand-green',
    refuse: 'bg-brand-red',
    ok: 'bg-brand-green',
    alerte: 'bg-amber-500',
    critique: 'bg-brand-red',
    gold: 'bg-gold',
    navy: 'bg-navy',
    neutral: 'bg-slate-400',
  };
  return (
    <span className={`chip ${tone_} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[tone] ?? dotColors.neutral}`} />}
      {children}
    </span>
  );
}
