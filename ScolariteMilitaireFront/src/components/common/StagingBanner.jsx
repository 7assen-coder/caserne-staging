/** Phase 31 — visible staging warning so officers do not confuse with prod. */
export default function StagingBanner() {
  const env = (import.meta.env.VITE_APP_ENV || '').trim().toLowerCase();
  if (env !== 'staging' && env !== 'render') return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-[100] w-full bg-amber-400 px-3 py-1.5 text-center text-xs font-semibold tracking-wide text-slate-900 shadow"
    >
      ENVIRONNEMENT DE TEST — données non productives ·{' '}
      {typeof window !== 'undefined' ? window.location.hostname : 'staging'}
    </div>
  );
}
