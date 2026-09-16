/** Shared Suspense fallback for lazy route pages (Phase 28). */
export default function PageFallback({ label = 'Chargement…' }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center font-medium text-navy">
      {label}
    </div>
  );
}
