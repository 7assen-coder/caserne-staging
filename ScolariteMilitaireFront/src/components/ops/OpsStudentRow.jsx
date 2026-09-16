import { ChevronRight } from 'lucide-react';
import { initials } from '../../utils/formatters';

/**
 * Shared student row chrome for ops lists.
 * middle: optional node(s) for columns between identity and chevron
 * gridClass: desktop grid template matching columnHeader
 */
export default function OpsStudentRow({
  row,
  onOpen,
  middle = null,
  gridClass = 'sm:grid sm:grid-cols-[minmax(0,1fr)_7rem_5rem_2rem] sm:gap-4 sm:items-center',
  photoUrl,
  nameLine,
  metaLine,
}) {
  const nomComplet =
    nameLine ?? (`${row?.prenom ?? ''} ${row?.nom ?? ''}`.trim() || '—');
  const meta = metaLine ?? (row?.matricule ? `Matricule ${row.matricule}` : null);
  const photo = photoUrl ?? row?.photoThumbUrl ?? row?.photoUrl;

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen?.(row)}
        className={`flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-slate-50/80 sm:px-6 ${gridClass}`}
      >
        <span className="flex min-w-0 items-center gap-3 sm:contents">
          <span className="flex min-w-0 flex-1 items-center gap-3 sm:min-w-0">
            {photo ? (
              <img
                src={photo}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
              />
            ) : (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy/10 text-xs font-bold text-navy">
                {initials(row?.nom, row?.prenom)}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate font-semibold text-slate-900">{nomComplet}</span>
              {meta ? <span className="block truncate text-xs text-slate-500">{meta}</span> : null}
            </span>
          </span>
          {middle}
        </span>
        <ChevronRight size={18} className="ml-auto shrink-0 text-slate-400 sm:ml-0" aria-hidden />
      </button>
    </li>
  );
}
