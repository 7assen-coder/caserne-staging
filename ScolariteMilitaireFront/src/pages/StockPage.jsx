import { useState } from 'react';
import { Package, PackageCheck, History } from 'lucide-react';
import Inventaire from '../components/stock/Inventaire';
import Attribution from '../components/stock/Attribution';
import HistoriqueStock from '../components/stock/HistoriqueStock';

export default function StockPage() {
  const [tab, setTab] = useState('inventaire');
  const [refresh, setRefresh] = useState(0);

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock & Habillement</h1>
          <p className="page-subtitle">Inventaire, attributions nominatives et historique</p>
        </div>
      </div>

      <nav className="flex items-center gap-1 border-b border-white/10">
        {[
          { key: 'inventaire', label: 'Inventaire', icon: Package },
          { key: 'attribution', label: 'Attribution', icon: PackageCheck },
          { key: 'historique', label: 'Historique', icon: History },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition ${
              tab === key
                ? 'border-gold text-navy font-medium'
                : 'border-transparent text-text-light hover:text-navy'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </nav>

      {tab === 'inventaire' && <Inventaire key={`inv-${refresh}`} />}
      {tab === 'attribution' && <Attribution onDone={() => setRefresh((r) => r + 1)} />}
      {tab === 'historique' && <HistoriqueStock key={`hist-${refresh}`} />}
    </div>
  );
}
