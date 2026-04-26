import { useState } from 'react';
import { Plus, CheckCircle2, XCircle, Clock, Eye } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import Badge from '../common/Badge';
import DataTable from '../common/DataTable';
import Modal from '../common/Modal';
import DemandePermission from './DemandePermission';
import ValidationPermission from './ValidationPermission';
import { useFetch } from '../../hooks/useFetch';
import { permissionService } from '../../services/permissionService';
import { STATUT_LABEL, FONCTIONS } from '../../utils/constants';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../../hooks/useAuth';

export default function ListePermissions() {
  const { fonction } = useAuth();
  const [filters, setFilters] = useState({ statut: '' });
  const [key, setKey] = useState(0);
  const { data } = useFetch(() => permissionService.list(filters), [filters, key]);
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);

  const canValidate =
    fonction === FONCTIONS.ENCADREMENT || fonction === FONCTIONS.COMMANDEMENT;

  const columns = [
    { key: 'eleveNom', label: 'Élève', sortable: true, render: (r) => (
        <div>
          <p className="font-medium text-text">{r.eleveNom}</p>
          <p className="text-xs text-text-light">{r.matricule} · {r.section}</p>
        </div>
      )
    },
    { key: 'typeAbsence', label: 'Type', render: (r) => STATUT_LABEL[r.typeAbsence] ?? r.typeAbsence },
    { key: 'motif', label: 'Motif', render: (r) => STATUT_LABEL[r.motif] ?? r.motif },
    { key: 'dateDebut', label: 'Début', render: (r) => formatDate(r.dateDebut), sortable: true },
    { key: 'dateFin', label: 'Fin', render: (r) => formatDate(r.dateFin) },
    {
      key: 'statut',
      label: 'Statut',
      render: (r) => {
        const tone =
          r.statut === 'valide' ? 'valide' : r.statut === 'refuse' ? 'refuse' : 'en_attente';
        const Icon = r.statut === 'valide' ? CheckCircle2 : r.statut === 'refuse' ? XCircle : Clock;
        return (
          <Badge tone={tone}>
            <Icon size={12} /> {STATUT_LABEL[r.statut]}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelected(r);
          }}
          className="p-1.5 text-text-light hover:text-navy"
        >
          <Eye size={16} />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Permissions</h1>
          <p className="page-subtitle">
            Demandes d'absence : cours, instruction militaire, activités
          </p>
        </div>
        <Button variant="primary" size="lg" icon={Plus} onClick={() => setCreating(true)}>
          Nouvelle demande
        </Button>
      </div>

      <Card title="Filtres">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            className="input"
            value={filters.statut}
            onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
          >
            <option value="">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="valide">Validé</option>
            <option value="refuse">Refusé</option>
          </select>
        </div>
      </Card>

      <Card>
        <DataTable
          columns={columns}
          rows={data ?? []}
          pageSize={10}
          onRowClick={(row) => setSelected(row)}
        />
      </Card>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Détail de la demande"
        subtitle={selected?.eleveNom}
        size="lg"
      >
        {selected && (
          <ValidationPermission
            permission={selected}
            canValidate={canValidate && selected.statut === 'en_attente'}
            onDone={() => {
              setSelected(null);
              setKey((k) => k + 1);
            }}
          />
        )}
      </Modal>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Nouvelle demande de permission"
        size="lg"
      >
        <DemandePermission
          onSubmit={async (values) => {
            await permissionService.create(values);
            setCreating(false);
            setKey((k) => k + 1);
          }}
          onCancel={() => setCreating(false)}
        />
      </Modal>
    </div>
  );
}
