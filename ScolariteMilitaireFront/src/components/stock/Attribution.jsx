import { useMemo, useState } from 'react';
import { PackageCheck } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { useFetch } from '../../hooks/useFetch';
import { stockService } from '../../services/stockService';
import { eleveService } from '../../services/eleveService';

export default function Attribution({ onDone }) {
  const { data: eleves } = useFetch(() => eleveService.list(), []);
  const { data: stock } = useFetch(() => stockService.list(), []);
  const [eleveId, setEleveId] = useState('');
  const [articleId, setArticleId] = useState('');
  const [quantite, setQuantite] = useState(1);
  const [status, setStatus] = useState(null);

  const eleve = useMemo(() => eleves?.find((x) => x.id === eleveId), [eleves, eleveId]);
  const article = useMemo(() => stock?.find((x) => x.id === articleId), [stock, articleId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!eleve || !article) return;
    const mvt = await stockService.attribuer({ articleId, eleve, quantite });
    setStatus({ ok: true, mvt });
    onDone?.();
  };

  return (
    <Card title="Attribuer un article" subtitle="Sortie de stock nominative">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block md:col-span-2">
          <span className="label">Élève bénéficiaire *</span>
          <select
            required
            className="input"
            value={eleveId}
            onChange={(e) => setEleveId(e.target.value)}
          >
            <option value="">— Sélectionner —</option>
            {(eleves ?? []).slice(0, 60).map((e) => (
              <option key={e.id} value={e.id}>
                {e.nom} {e.prenom} ({e.matricule})
              </option>
            ))}
          </select>
        </label>

        {eleve && (
          <div className="rounded-md border border-white/10 bg-slate-900/60 p-3 text-sm text-slate-300 md:col-span-2">
            <p className="font-medium text-navy">Mesures de {eleve.prenom}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2 text-xs text-text-light">
              <span>Chemise : <strong className="text-text">{eleve.habillement.tailleChemise}</strong></span>
              <span>Pantalon : <strong className="text-text">{eleve.habillement.taillePantalon}</strong></span>
              <span>Pointure : <strong className="text-text">{eleve.habillement.pointure}</strong></span>
            </div>
          </div>
        )}

        <label className="block">
          <span className="label">Article *</span>
          <select
            required
            className="input"
            value={articleId}
            onChange={(e) => setArticleId(e.target.value)}
          >
            <option value="">— Sélectionner —</option>
            {(stock ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.article} · {s.taille} ({s.quantite} dispo)
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label">Quantité</span>
          <input
            type="number"
            min={1}
            max={article?.quantite ?? 1}
            className="input"
            value={quantite}
            onChange={(e) => setQuantite(Number(e.target.value))}
          />
        </label>

        <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3 md:col-span-2">
          {status?.ok && (
            <Badge tone="present">
              <PackageCheck size={14} /> Attribution enregistrée
            </Badge>
          )}
          <Button type="submit" variant="primary" icon={PackageCheck}>
            Valider l'attribution
          </Button>
        </div>
      </form>
    </Card>
  );
}
