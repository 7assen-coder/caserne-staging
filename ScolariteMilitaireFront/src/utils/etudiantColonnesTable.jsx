import { resolveColonnes } from '../data/etudiantColonnes';
import { formatDisplayText } from './displayText';

/** Ordre des champs sur la carte mobile (liste étudiants). */
export const MOBILE_LIST_COLUMN_ORDER = [
  'matricule',
  'prenom',
  'nom_famille',
  'departement',
  'niveau',
  'statut_academique',
];

function NomPrenomCell({ eleve: r }) {
  const prenom = formatDisplayText(r.prenom);
  const nom = formatDisplayText(r.nom);
  return (
    <div>
      <p className="font-medium text-text">
        {prenom} {nom}
      </p>
      <p className="flex flex-wrap items-center gap-1.5 text-sm text-text-light">
        <span>{r.sexe === 'F' ? 'F' : 'M'}</span>
        {r.profilIncomplet ? (
          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-amber-100">
            À compléter
          </span>
        ) : null}
      </p>
    </div>
  );
}

function displayCellValue(col, row) {
  const raw = col.getValue(row);
  if (raw == null || raw === '') return '—';
  return formatDisplayText(raw);
}

/** Construit les colonnes DataTable à partir des identifiants visibles. */
export function buildDataTableColumns(visibleIds) {
  return resolveColonnes(visibleIds).map((col) => {
    const base = {
      key: col.id,
      label: col.label,
      sortable: !!col.sortable,
      accessor: (r) => displayCellValue(col, r),
    };

    if (col.id === 'prenom' || col.id === 'nom_famille') {
      if (col.id === 'prenom') {
        return { ...base, render: (r) => <NomPrenomCell eleve={r} /> };
      }
      // Avoid duplicate compound cell when both prenom + nom_famille are visible
      return {
        ...base,
        render: (r) => <span className="text-slate-900">{displayCellValue(col, r)}</span>,
      };
    }

    const plain = ['matricule', 'niveau', 'departement', 'statut_academique'];
    if (plain.includes(col.id)) {
      return {
        ...base,
        render: (r) => <span className="text-slate-900">{displayCellValue(col, r)}</span>,
      };
    }

    return {
      ...base,
      render: (r) => {
        const v = displayCellValue(col, r);
        return v === '—' ? <span className="text-text-muted">—</span> : <span className="text-text">{v}</span>;
      },
    };
  });
}

/** Colonnes triées pour l’affichage mobile uniquement. */
export function orderColumnsForMobile(columns, order = MOBILE_LIST_COLUMN_ORDER) {
  const byKey = Object.fromEntries(columns.map((c) => [c.key, c]));
  const ordered = order.map((key) => byKey[key]).filter(Boolean);
  const rest = columns.filter((c) => !order.includes(c.key));
  return [...ordered, ...rest];
}
