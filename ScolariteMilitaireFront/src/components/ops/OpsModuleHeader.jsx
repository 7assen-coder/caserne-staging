/** Module page title row (Phase 30). */
export default function OpsModuleHeader({ icon: Icon, title, subtitle, actions = null }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy/5 text-navy ring-1 ring-navy/10">
            <Icon size={22} strokeWidth={1.75} aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0">
          <h1 className="font-serif text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      {actions}
    </header>
  );
}
