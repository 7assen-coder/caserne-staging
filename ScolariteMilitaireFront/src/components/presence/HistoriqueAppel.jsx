import { useState } from 'react';
import Card from '../common/Card';
import DataTable from '../common/DataTable';
import Badge from '../common/Badge';
import { useFetch } from '../../hooks/useFetch';
import { presenceService } from '../../services/presenceService';
import { SECTIONS, TYPES_RASSEMBLEMENT, STATUT_LABEL } from '../../utils/constants';
import { formatDateTime } from '../../utils/formatters';

export default function HistoriqueAppel() {
  const [filters, setFilters] = useState({ section: '', type: '' });
  const { data } = useFetch(() => presenceService.list(filters), [filters]);

  const columns = [
    { key: 'date', label: 'Date / heure', sortable: true, render: (r) => formatDateTime(r.date) },
    { key: 'section', label: 'Section', sortable: true },
    { key: 'compagnie', label: 'Compagnie', sortable: true },
    { key: 'type', label: 'Type', render: (r) => STATUT_LABEL[r.type] ?? r.type },
    { key: 'superviseur', label: 'Superviseur' },
    { key: 'presents', label: 'Présents', align: 'right', sortable: true },
    { key: 'absents', label: 'Absents', align: 'right', sortable: true },
    {
      key: 'statut',
      label: 'Statut',
      render: (r) => (
        <Badge tone={r.statut === 'en_cours' ? 'alerte' : 'present'}>
          {r.statut === 'en_cours' ? 'En cours' : 'Transmis'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card title="Filtres">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            className="input"
            value={filters.section}
            onChange={(e) => setFilters({ ...filters, section: e.target.value })}
          >
            <option value="">Toutes les sections</option>
            {SECTIONS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            className="input"
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            <option value="">Tous les types</option>
            {TYPES_RASSEMBLEMENT.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card title="Historique des appels">
        <DataTable columns={columns} rows={data ?? []} pageSize={10} />
      </Card>
    </div>
  );
}
