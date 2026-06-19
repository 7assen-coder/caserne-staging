/** Barre de filtres fixe pendant le défilement de la liste. */
export default function StickyFilterBar({ children, className = '' }) {
  return (
    <div
      className={`sticky top-0 z-20 xl:col-span-12 ${className}`}
      style={{ paddingTop: 'max(0px, env(safe-area-inset-top))' }}
    >
      <div className="rounded-2xl bg-off-white/95 shadow-sm ring-1 ring-slate-200/60 backdrop-blur-sm supports-[backdrop-filter]:bg-off-white/90">
        {children}
      </div>
    </div>
  );
}
