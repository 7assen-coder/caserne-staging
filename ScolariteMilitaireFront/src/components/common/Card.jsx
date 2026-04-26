export default function Card({
  title,
  subtitle,
  actions,
  children,
  className = '',
  bodyClassName = '',
  hover = false,
  accent,
}) {
  return (
    <section
      className={`card flex min-h-0 flex-col overflow-hidden ${hover ? 'card-hover' : ''} ${className}`}
    >
      {accent && (
        <div className={`h-1 shrink-0 ${accent === 'gold' ? 'bg-gold' : 'bg-navy dark:bg-navy-500'}`} />
      )}
      {(title || actions) && (
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-light-gray px-5 py-5 md:px-7 md:py-6">
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="section-title truncate">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm md:text-base text-text-light dark:text-slate-400 mt-1">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </header>
      )}
      <div className={`min-h-0 flex-1 p-5 md:p-7 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
