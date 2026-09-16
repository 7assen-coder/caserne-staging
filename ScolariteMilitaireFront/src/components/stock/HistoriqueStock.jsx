import Card from '../common/Card';
import DataTable from '../common/DataTable';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { useAuth } from '../../hooks/useAuth';
import { stockService } from '../../services/stockService';
import { formatDateTime } from '../../utils/formatters';

export default function HistoriqueStock() {
  const { bootstrapped, isAuthenticated } = useAuth();
  const { data } = useQuery({
    queryKey: queryKeys.stock.mouvements(),
    queryFn: () => stockService.mouvements(),
    enabled: bootstrapped && isAuthenticated,
  });

  const columns = [
    { key: 'date', label: 'Date', sortable: true, render: (r) => formatDateTime(r.date) },
    { key: 'article', label: 'Article' },
    { key: 'taille', label: 'Taille' },
    {
      key: 'quantite',
      label: 'Quantité',
      align: 'right',
      render: (r) => (
        <span className={r.quantite < 0 ? 'text-brand-red' : 'text-brand-green'}>
          {r.quantite > 0 ? `+${r.quantite}` : r.quantite}
        </span>
      ),
    },
    { key: 'beneficiaire', label: 'Bénéficiaire' },
    { key: 'matricule', label: 'Matricule' },
    { key: 'operateur', label: 'Opérateur' },
  ];

  return (
    <Card title="Historique des mouvements" subtitle="Entrées et sorties du stock">
      <DataTable columns={columns} rows={data ?? []} pageSize={10} />
    </Card>
  );
}
