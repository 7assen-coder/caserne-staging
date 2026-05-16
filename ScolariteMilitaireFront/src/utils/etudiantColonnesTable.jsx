import { resolveColonnes } from '../data/etudiantColonnes';

function NomPrenomCell({ eleve: r }) {
  return (
    <div>
      <p className="font-medium text-text">
        {r.nom} {r.prenom}
      </p>
      <p className="text-sm text-text-light">{r.sexe === 'F' ? 'Féminin' : 'Masculin'}</p>
    </div>
  );
}

/** Construit les colonnes DataTable à partir des identifiants visibles. */
export function buildDataTableColumns(visibleIds) {
  return resolveColonnes(visibleIds).map((col) => {
    const base = {
      key: col.id,
      label: col.label,
      sortable: !!col.sortable,
      accessor: col.accessor ?? ((r) => col.getValue(r)),
    };

    if (col.id === 'nom') {
      return { ...base, render: (r) => <NomPrenomCell eleve={r} /> };
    }

    const plain = ['niveau', 'departement', 'compagnie', 'section', 'semestre'];
    if (plain.includes(col.id)) {
      return {
        ...base,
        render: (r) => <span className="text-slate-900">{col.getValue(r) || '—'}</span>,
      };
    }

    return {
      ...base,
      render: (r) => {
        const v = col.getValue(r);
        return v ? <span className="text-text">{v}</span> : <span className="text-text-muted">—</span>;
      },
    };
  });
}
