import { useState } from 'react';
import { ClipboardList, History } from 'lucide-react';
import LancerAppel from '../components/presence/LancerAppel';
import HistoriqueAppel from '../components/presence/HistoriqueAppel';

export default function PresencePage() {
  const [tab, setTab] = useState('lancer');
  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1 border-b border-white/10">
        <button
          onClick={() => setTab('lancer')}
          className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition ${
            tab === 'lancer'
              ? 'border-gold text-navy font-medium'
              : 'border-transparent text-text-light hover:text-navy'
          }`}
        >
          <ClipboardList size={16} /> Lancer un appel
        </button>
        <button
          onClick={() => setTab('historique')}
          className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition ${
            tab === 'historique'
              ? 'border-gold text-navy font-medium'
              : 'border-transparent text-text-light hover:text-navy'
          }`}
        >
          <History size={16} /> Historique
        </button>
      </nav>

      {tab === 'lancer' && <LancerAppel />}
      {tab === 'historique' && <HistoriqueAppel />}
    </div>
  );
}
