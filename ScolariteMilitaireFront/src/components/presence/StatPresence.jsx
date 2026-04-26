import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import Card from '../common/Card';
import { useFetch } from '../../hooks/useFetch';
import { presenceService } from '../../services/presenceService';

export default function StatPresence() {
  const { data: parSection } = useFetch(() => presenceService.parSection(), []);
  const { data: trend } = useFetch(() => presenceService.trend(), []);
  const { data: top } = useFetch(() => presenceService.topAbsences(), []);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Statistiques de présence</h1>
          <p className="page-subtitle">Indicateurs consolidés sur 7 jours</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Taux de présence par section">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={parSection ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" />
                <XAxis dataKey="section" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} domain={[70, 100]} />
                <Tooltip contentStyle={{ border: '1px solid #E2E6EC', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="taux" fill="#1B2A4A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Évolution sur 7 jours">
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={trend ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" />
                <XAxis dataKey="jour" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} domain={[80, 100]} />
                <Tooltip contentStyle={{ border: '1px solid #E2E6EC', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="taux" stroke="#C8A54E" strokeWidth={2.5} dot={{ r: 4, fill: '#1B2A4A' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Top 10 absences">
        <div className="overflow-x-auto">
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
                  <td>{row.eleve}</td>
                  <td>{row.matricule}</td>
                  <td>{row.section}</td>
                  <td className="text-right">{row.absences}</td>
                  <td className="text-right text-brand-red">{row.nonJustifiees}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
