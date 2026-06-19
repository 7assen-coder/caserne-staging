import { Users, UserCheck, UserX, Percent, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../common/Card';
import StatCard from '../common/StatCard';
import Badge from '../common/Badge';
import { formatDateTime } from '../../utils/formatters';
import { STATUT_LABEL } from '../../utils/constants';

export default function ResultatAppel({ appel }) {
  if (!appel) return null;
  const taux = appel.total ? Math.round((appel.presents / appel.total) * 100) : 0;
  const detail = appel.detail ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-serif text-navy">Résultat de l'appel</h2>
        <p className="text-sm text-text-light">
          {appel.section} · {STATUT_LABEL[appel.type] ?? appel.type} · {formatDateTime(appel.date)}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Effectif" value={appel.total} accent="navy" />
        <StatCard icon={UserCheck} label="Présents" value={appel.presents} accent="green" />
        <StatCard icon={UserX} label="Absents" value={appel.absents} accent="red" />
        <StatCard icon={Percent} label="Taux présence" value={`${taux}%`} accent="gold" />
      </div>

      {detail.length > 0 && (
        <Card title="Détail nominatif" subtitle={`${appel.absents} absence${appel.absents > 1 ? 's' : ''} à justifier`}>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Matricule</th>
                  <th>Nom</th>
                  <th>Statut</th>
                  <th>Motif</th>
                </tr>
              </thead>
              <tbody>
                {detail.map((d) => (
                  <tr key={d.eleveId ?? d.matricule}>
                    <td>{d.matricule}</td>
                    <td>
                      <span className="inline-flex items-center gap-2">
                        {d.nom}
                        {d.eleveId ? (
                          <Link
                            to="/eleves/dossiers"
                            state={{ openEleveId: d.eleveId }}
                            className="inline-flex text-navy hover:text-gold"
                            title="Ouvrir le dossier"
                          >
                            <ExternalLink size={14} aria-hidden />
                          </Link>
                        ) : null}
                      </span>
                    </td>
                    <td>
                      <Badge tone={d.statut === 'present' ? 'present' : 'absent'}>
                        {d.statut === 'present' ? 'Présent' : 'Absent'}
                      </Badge>
                    </td>
                    <td>{d.motif ? STATUT_LABEL[d.motif] ?? d.motif : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
