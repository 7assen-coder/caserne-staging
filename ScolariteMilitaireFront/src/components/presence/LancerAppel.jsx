import { useMemo, useState } from 'react';
import { ScanFace, Check, X as XIcon, Send, RotateCcw } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import Badge from '../common/Badge';
import ResultatAppel from './ResultatAppel';
import { useFetch } from '../../hooks/useFetch';
import { eleveService } from '../../services/eleveService';
import { presenceService } from '../../services/presenceService';
import { SECTIONS, TYPES_RASSEMBLEMENT, MOTIFS_ABSENCE } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';

export default function LancerAppel() {
  const { user } = useAuth();
  const [section, setSection] = useState(user?.section ?? SECTIONS[0]);
  const [type, setType] = useState(TYPES_RASSEMBLEMENT[0].value);
  const [scan, setScan] = useState(false);
  const [statuts, setStatuts] = useState({}); // { eleveId: 'present'|'absent' }
  const [motifs, setMotifs] = useState({}); // { eleveId: 'medical' }
  const [submitted, setSubmitted] = useState(null);

  const { data: eleves } = useFetch(() => eleveService.list({ section }), [section]);

  const handleScan = () => {
    setScan(true);
    setTimeout(() => {
      const auto = {};
      (eleves ?? []).forEach((e, i) => {
        auto[e.id] = i % 7 === 0 ? 'absent' : 'present';
      });
      setStatuts(auto);
      setScan(false);
    }, 900);
  };

  const reset = () => {
    setStatuts({});
    setMotifs({});
    setSubmitted(null);
  };

  const toggle = (id) => {
    setStatuts((prev) => ({
      ...prev,
      [id]: prev[id] === 'absent' ? 'present' : 'absent',
    }));
  };

  const counts = useMemo(() => {
    const p = Object.values(statuts).filter((s) => s === 'present').length;
    const a = Object.values(statuts).filter((s) => s === 'absent').length;
    return { presents: p, absents: a, total: (eleves?.length ?? 0) };
  }, [statuts, eleves]);

  const envoyer = async () => {
    const payload = {
      section,
      type,
      compagnie: eleves?.[0]?.compagnie ?? '',
      superviseur: `${user?.grade ?? ''} ${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim(),
      total: counts.total,
      presents: counts.presents,
      absents: counts.absents,
      statut: 'transmis',
      detail: (eleves ?? []).map((e) => ({
        eleveId: e.id,
        matricule: e.matricule,
        nom: `${e.nom} ${e.prenom}`,
        statut: statuts[e.id] ?? 'present',
        motif: motifs[e.id] ?? null,
      })),
    };
    const saved = await presenceService.create(payload);
    setSubmitted(saved);
  };

  if (submitted) {
    return (
      <div className="space-y-4">
        <ResultatAppel appel={submitted} />
        <div className="flex justify-end">
          <Button variant="secondary" icon={RotateCcw} onClick={reset}>
            Lancer un nouvel appel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Lancer un appel</h1>
          <p className="page-subtitle">Rassemblement de section — scan facial simulé</p>
        </div>
      </div>

      <Card title="Paramètres de l'appel">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="block">
            <span className="label">Section</span>
            <select className="input" value={section} onChange={(e) => setSection(e.target.value)}>
              {SECTIONS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Type de rassemblement</span>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES_RASSEMBLEMENT.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <Button variant="gold" icon={ScanFace} onClick={handleScan} disabled={scan} className="w-full">
              {scan ? 'Scan en cours…' : 'Lancer le scan facial'}
            </Button>
          </div>
        </div>
      </Card>

      <Card
        title={`Effectif — ${section}`}
        subtitle={`${counts.total} élèves · ${counts.presents} présents · ${counts.absents} absents`}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone="present">P {counts.presents}</Badge>
            <Badge tone="absent">A {counts.absents}</Badge>
          </div>
        }
      >
        <ul className="divide-y divide-light-gray">
          {(eleves ?? []).map((e) => {
            const statut = statuts[e.id] ?? 'present';
            const isAbsent = statut === 'absent';
            return (
              <li key={e.id} className="flex items-center gap-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text">
                    {e.nom} {e.prenom}
                  </p>
                  <p className="text-xs text-text-light">{e.matricule}</p>
                </div>

                {isAbsent && (
                  <select
                    className="input w-48"
                    value={motifs[e.id] ?? ''}
                    onChange={(ev) => setMotifs({ ...motifs, [e.id]: ev.target.value })}
                  >
                    <option value="">Motif (obligatoire)</option>
                    {MOTIFS_ABSENCE.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => toggle(e.id)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                    isAbsent
                      ? 'bg-brand-red/10 text-brand-red border-brand-red/30'
                      : 'bg-brand-green/10 text-brand-green border-brand-green/30'
                  }`}
                >
                  {isAbsent ? <XIcon size={14} /> : <Check size={14} />}
                  {isAbsent ? 'Absent' : 'Présent'}
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button variant="ghost" icon={RotateCcw} onClick={reset}>
          Réinitialiser
        </Button>
        <Button
          variant="primary"
          icon={Send}
          onClick={envoyer}
          disabled={counts.total === 0}
        >
          Envoyer au superviseur encadrement
        </Button>
      </div>
    </div>
  );
}
