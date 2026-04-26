import Card from '../common/Card';
import Badge from '../common/Badge';
import DataTable from '../common/DataTable';
import { useFetch } from '../../hooks/useFetch';
import { stockService } from '../../services/stockService';

export default function Inventaire() {
  const { data } = useFetch(() => stockService.list(), []);

  const columns = [
    { key: 'article', label: 'Article', sortable: true },
    { key: 'taille', label: 'Taille', sortable: true },
    {
      key: 'quantite',
      label: 'Quantité',
      align: 'right',
      sortable: true,
      render: (r) => (
        <span
          className={
            r.quantite <= Math.max(1, r.seuil / 3)
              ? 'text-brand-red font-semibold'
              : r.quantite <= r.seuil
                ? 'text-amber-700 font-semibold'
                : ''
          }
        >
          {r.quantite}
        </span>
      ),
    },
    { key: 'seuil', label: "Seuil d'alerte", align: 'right' },
    {
      key: 'statut',
      label: 'État',
      render: (r) => (
        <Badge tone={r.statut === 'ok' ? 'ok' : r.statut === 'alerte' ? 'alerte' : 'critique'}>
          {r.statut === 'ok' ? 'Disponible' : r.statut === 'alerte' ? 'Seuil bas' : 'Critique'}
        </Badge>
      ),
    },
  ];

  return (
    <Card title="Inventaire habillement" subtitle={`${data?.length ?? 0} références suivies`}>
      <DataTable columns={columns} rows={data ?? []} pageSize={10} />
    </Card>
  );
}
