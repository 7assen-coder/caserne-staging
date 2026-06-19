import { resolveColonnes } from '../data/etudiantColonnes';
import { formatDisplayText } from './displayText';

/** Ordre des champs sur la carte mobile (liste étudiants). */
export const MOBILE_LIST_COLUMN_ORDER = [
  'matricule',
  'nom',
  'departement',
  'niveau',
  'compagnie',
  'section',
];

function NomPrenomCell({ eleve: r }) {
  const prenom = formatDisplayText(r.prenom);
  const nom = formatDisplayText(r.nom);
  return (
    <div>
      <p className="font-medium text-text">
        {prenom} {nom}
      </p>
      <p className="text-sm text-text-light">{r.sexe === 'F' ? 'Féminin' : 'Masculin'}</p>
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

    if (col.id === 'nom') {
      return { ...base, render: (r) => <NomPrenomCell eleve={r} /> };
    }

    const plain = ['matricule', 'niveau', 'departement', 'compagnie', 'section', 'semestre'];
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
