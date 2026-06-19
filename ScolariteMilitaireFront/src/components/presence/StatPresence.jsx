import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../common/Card';
import { useFetch } from '../../hooks/useFetch';
import { presenceService } from '../../services/presenceService';
import { PRESENCE_CHANGED } from '../../utils/presenceStore';

function Charts({ parSection, trend }) {
  const [Recharts, setRecharts] = useState(null);

  useEffect(() => {
    let cancelled = false;
    import('recharts').then((mod) => {
      if (!cancelled) setRecharts(mod);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Recharts) {
    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-72 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  const {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    LineChart,
    Line,
  } = Recharts;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card title="Taux de présence par section">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={parSection ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" />
              <XAxis dataKey="section" stroke="#64748B" fontSize={12} />
              <YAxis stroke="#64748B" fontSize={12} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ border: '1px solid #E2E6EC', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="taux" fill="#1B2A4A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Évolution sur 7 jours">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" />
              <XAxis dataKey="jour" stroke="#64748B" fontSize={12} />
              <YAxis stroke="#64748B" fontSize={12} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ border: '1px solid #E2E6EC', borderRadius: 8, fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="taux"
                stroke="#C8A54E"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#1B2A4A' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

export default function StatPresence({ embedded = false, refreshKey = 0 }) {
  const [key, setKey] = useState(0);

  useEffect(() => {
    const refresh = () => setKey((k) => k + 1);
    window.addEventListener(PRESENCE_CHANGED, refresh);
    return () => window.removeEventListener(PRESENCE_CHANGED, refresh);
  }, []);

  const { data: parSection } = useFetch(() => presenceService.parSection(), [key, refreshKey]);
  const { data: trend } = useFetch(() => presenceService.trend(), [key, refreshKey]);
  const { data: top } = useFetch(() => presenceService.topAbsences(), [key, refreshKey]);

  const hasData = (parSection ?? []).length > 0 || (trend ?? []).some((d) => d.presents > 0);

  return (
    <div className="space-y-6">
      {!embedded ? (
        <div className="page-header">
          <div>
            <h1 className="page-title">Statistiques de présence</h1>
            <p className="page-subtitle">Indicateurs consolidés sur 7 jours</p>
          </div>
        </div>
      ) : null}

      {!hasData ? (
        <div className="rounded-2xl border border-light-gray bg-white px-6 py-14 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-700">Aucune statistique disponible</p>
          <p className="mt-1 text-sm text-slate-500">
            Enregistrez des appels depuis l&apos;onglet « Lancer un appel » pour alimenter les graphiques.
          </p>
        </div>
      ) : (
        <>
          <Charts parSection={parSection} trend={trend} />

          <Card title="Top absences">
            <div className="overflow-x-auto">
              {(top ?? []).length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  Aucune absence enregistrée dans l&apos;historique.
                </p>
              ) : (
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Élève</th>
                      <th>Matricule</th>
                      <th>Section</th>
                      <th className="text-right">Absences</th>
                      <th className="text-right">Non justifiées</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(top ?? []).map((row) => (
                      <tr key={row.matricule}>
                        <td>
                          {row.eleveId ? (
                            <Link
                              to="/eleves/dossiers"
                              state={{ openEleveId: row.eleveId }}
                              className="font-medium text-navy hover:underline"
                            >
                              {row.eleve}
                            </Link>
                          ) : (
                            row.eleve
                          )}
                        </td>
                        <td>{row.matricule}</td>
                        <td>{row.section}</td>
                        <td className="text-right">{row.absences}</td>
                        <td className="text-right text-brand-red">{row.nonJustifiees}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
