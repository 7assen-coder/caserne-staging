import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, ClipboardList, History, UserCheck } from 'lucide-react';
import HistoriqueAppel from '../components/presence/HistoriqueAppel';
import LancerAppel from '../components/presence/LancerAppel';
import StatPresence from '../components/presence/StatPresence';
import { useAuth } from '../hooks/useAuth';
import { ROLE_LABEL, getCanonicalRole } from '../utils/userRole';

export default function PresencePage() {
  const { fonction } = useAuth();
  const role = getCanonicalRole(fonction);
  const [tab, setTab] = useState('lancer');
  const [historiqueKey, setHistoriqueKey] = useState(0);

  const tabs = useMemo(
    () => [
      { id: 'lancer', label: 'Lancer un appel', icon: ClipboardList },
      { id: 'historique', label: 'Historique', icon: History },
      { id: 'stats', label: 'Statistiques', icon: BarChart3 },
    ],
    [],
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 pb-8">
      <nav>
        <div className="inline-flex items-center gap-2 rounded-full border border-light-gray bg-white px-3 py-1.5 text-sm text-text-light shadow-sm">
          <Link to="/dashboard" className="font-medium transition hover:text-navy">
            Accueil
          </Link>
          <span aria-hidden>/</span>
          <span className="font-semibold text-navy">Présence</span>
        </div>
      </nav>

      <header className="flex flex-col gap-4 rounded-2xl border border-light-gray bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy text-white shadow-sm">
            <UserCheck size={22} strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="font-serif text-xl font-semibold text-slate-900 sm:text-2xl">
              Appels de présence
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Rassemblements par section · {ROLE_LABEL[role]}
            </p>
          </div>
        </div>
        <p className="max-w-xs text-xs leading-snug text-slate-500">
          Données enregistrées localement. Les élèves proviennent de l&apos;import ou de la création de dossiers.
        </p>
      </header>

      <div className="flex flex-wrap gap-1 rounded-xl border border-light-gray bg-white p-1 shadow-sm">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition sm:flex-none ${
              tab === id
                ? 'bg-navy text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
            }`}
          >
            <Icon size={16} aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {tab === 'lancer' ? (
        <LancerAppel
          onSubmitted={() => {
            setHistoriqueKey((k) => k + 1);
          }}
        />
      ) : null}
      {tab === 'historique' ? <HistoriqueAppel refreshKey={historiqueKey} /> : null}
      {tab === 'stats' ? <StatPresence embedded refreshKey={historiqueKey} /> : null}
    </div>
  );
}
