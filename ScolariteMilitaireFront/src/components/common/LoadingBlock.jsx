/** Centered loading placeholder for list bodies (Phase 29). */
export default function LoadingBlock({ label = 'Chargement…', className = '' }) {
  return (
    <div
      className={`flex min-h-[12rem] items-center justify-center px-6 py-16 text-sm text-slate-500 ${className}`}
      role="status"
      aria-live="polite"
    >
      {label}
    </div>
  );
}
