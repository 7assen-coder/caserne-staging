import { useEffect, useMemo, useState } from 'react';
import {
  FileSpreadsheet,
  FileType,
  Presentation,
  FileDown,
  BookOpen,
  UserCheck,
} from 'lucide-react';
import Button from '../common/Button';
import FullScreenLayer from '../common/FullScreenLayer';
import SelectField from '../common/SelectField';
import { eleves as mockEleves } from '../../data/mockData';
import { exportRapportDashboard } from '../../utils/dashboardExport';
import { useMockEleves } from '../../utils/frontendMode';
import { eleveService } from '../../services/eleveService';
import {
  downloadAttestationParcoursIrt,
  downloadAttestationScolarite,
  downloadReleveSemestre,
} from '../../utils/wordExport';
import { printAttestationParcoursIrt, printReleveSemestreHtml } from '../../utils/printDocuments';
import * as XLSX from 'xlsx';
import { saveAs } from '../../utils/saveAsFile.js';
import { getDecisionCode, getDecisionLabel } from '../../utils/gradeDecision';
import { enrichirModuleAvecReferenceEsp } from '../../data/espFormationCatalog';

const RAPPORTS = [
  { id: 'inscriptions', label: 'Inscriptions (par filière)' },
  { id: 'suspendus', label: 'Étudiants suspendus' },
  { id: 'presence', label: 'Présence & appels' },
];

const FORMATS = [
  { id: 'pdf', label: 'PDF', icon: FileType },
  { id: 'pptx', label: 'PowerPoint', icon: Presentation },
  { id: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
];

function exportReleveXlsx(eleve, semestreIndex) {
  const releves = eleve.relevesSemestres;
  if (!releves?.length) return;
  const block = releves[Math.min(semestreIndex, releves.length - 1)];
  const head = [
    'Code',
    'Intitulé',
    'UE',
    'Pôle',
    'H tot.',
    'CM/TD/TP',
    'ECTS',
    'Note / 20',
    'Déc.',
    'Décision (libellé)',
  ];
  const rows = (block.modules || []).map((raw) => {
    const m = enrichirModuleAvecReferenceEsp(raw);
    const hasVol = m.cm != null || m.td != null || m.tp != null;
    const cmtp = !hasVol ? '—' : `${m.cm ?? 0} / ${m.td ?? 0} / ${m.tp ?? 0}`;
    return [
      m.code,
      m.intitule,
      m.ue || '—',
      m.pole || '—',
      m.heuresTotal ?? '—',
      cmtp,
      m.credit,
      m.note,
      getDecisionCode(raw),
      getDecisionLabel(raw),
    ];
  });
  const aoa = [
    ['Relevé de notes (relevé en ligne)', block.periode],
    [eleve.prenom, eleve.nom, eleve.matricule],
    [],
    head,
    ...rows,
    [],
    ['Moyenne générale', block.moyenneGenerale],
    ['Crédits', `${block.creditObtenu} / ${block.creditTotal}`],
    ['Décision semestre', block.resultat],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Relevé');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  saveAs(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `Releve_${(eleve.matricule || 'x').replace(/\//g, '-')}_${block.code || 'S'}.xlsx`,
  );
}

export default function DashboardExportModal({ open, onClose }) {
  const [onglet, setOnglet] = useState('rapports');
  const [rapportType, setRapportType] = useState('inscriptions');
  const [format, setFormat] = useState('pdf');
  const [eleves, setEleves] = useState(() => (useMockEleves() ? mockEleves : []));
  const [eleveId, setEleveId] = useState(() => (useMockEleves() ? mockEleves[0]?.id || '' : ''));
  const [semIndex, setSemIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  const [qMat, setQMat] = useState('');
  const [fDept, setFDept] = useState('');
  const [fAnnee, setFAnnee] = useState('');

  useEffect(() => {
    if (!open || useMockEleves()) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const rows = await eleveService.list({});
        if (cancelled) return;
        setEleves(rows);
        setEleveId((prev) => {
          if (prev && rows.some((e) => String(e.id) === String(prev))) return prev;
          return rows[0]?.id || '';
        });
      } catch {
        if (!cancelled) setEleves([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const deptOptions = useMemo(() => {
    const set = new Set();
    for (const e of eleves) set.add(e.filiere ?? e.scolarite?.filiere ?? '');
    return [{ value: '', label: 'Tous' }].concat(
      [...set]
        .filter(Boolean)
        .sort((a, b) => String(a).localeCompare(String(b), 'fr'))
        .map((d) => ({ value: d, label: d })),
    );
  }, [eleves]);
  const anneeOptions = useMemo(() => {
    const set = new Set();
    for (const e of eleves) set.add(e.scolarite?.niveau ?? '');
    return [{ value: '', label: 'Toutes' }].concat(
      [...set]
        .filter(Boolean)
        .sort((a, b) => String(a).localeCompare(String(b), 'fr'))
        .map((a) => ({ value: a, label: a })),
    );
  }, [eleves]);

  const elevesFiltres = useMemo(() => {
    const q = String(qMat).trim().toLowerCase();
    return eleves.filter((e) => {
      if (q && !String(e.matricule ?? '').toLowerCase().includes(q)) return false;
      const dep = e.filiere ?? e.scolarite?.filiere ?? '';
      const an = e.scolarite?.niveau ?? '';
      if (fDept && dep !== fDept) return false;
      if (fAnnee && an !== fAnnee) return false;
      return true;
    });
  }, [eleves, qMat, fDept, fAnnee]);

  const eleve = useMemo(() => eleves.find((e) => e.id === eleveId) || eleves[0], [eleves, eleveId]);
  const semIdxEffectif = Math.min(
    semIndex,
    Math.max(0, (eleve?.relevesSemestres?.length ?? 1) - 1),
  );
  const semestreOptions = useMemo(() => {
    if (!eleve?.relevesSemestres?.length) return [];
    return eleve.relevesSemestres.map((r, i) => ({ i, label: r.periode, code: r.code }));
  }, [eleve]);

  const lancerRapport = async () => {
    setBusy(true);
    try {
      await exportRapportDashboard(rapportType, format, { elevesList: eleves });
      onClose?.();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <FullScreenLayer
      open={open}
      onClose={onClose}
      title="Exports & documents"
      subtitle="Rapports d’activité, attestations de parcours et relevés de notes (démonstration)"
      chrome
      contentClassName="p-5 sm:p-6"
    >
      <div className="flex flex-wrap gap-2 border-b border-light-gray pb-4">
        {[
          { id: 'rapports', label: 'Rapports synthèse', icon: FileDown },
          { id: 'attestation', label: 'Attestations', icon: UserCheck },
          { id: 'releve', label: 'Relevé de notes', icon: BookOpen },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setOnglet(t.id)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              onglet === t.id
                ? 'bg-navy text-white ring-1 ring-gold/35'
                : 'bg-off-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {onglet === 'rapports' && (
        <div className="mt-5 space-y-5">
          <p className="text-sm text-text-light">
            Exportez un rapport consolidé (données de démonstration) au format choisi. Les indicateurs du tableau de bord sont repris
            en en-tête.
          </p>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Type de rapport</p>
            <div className="grid gap-2 sm:grid-cols-1">
              {RAPPORTS.map((r) => (
                <label
                  key={r.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-light-gray bg-white px-4 py-3 hover:border-gold/40 hover:bg-off-white"
                >
                  <input
                    type="radio"
                    name="rt"
                    checked={rapportType === r.id}
                    onChange={() => setRapportType(r.id)}
                    className="h-4 w-4 text-gold"
                  />
                  <span className="text-slate-900">{r.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Format</p>
            <div className="flex flex-wrap gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormat(f.id)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                    format === f.id ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-200' : 'bg-off-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <f.icon size={16} />
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <Button variant="primary" onClick={lancerRapport} disabled={busy} icon={FileDown} iconPosition="right">
            {busy ? 'Génération…' : 'Télécharger le rapport'}
          </Button>
        </div>
      )}

      {onglet === 'attestation' && eleve && (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-light-gray bg-white p-4 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Sélection étudiant</p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-5">
                <label className="label">Matricule</label>
                <input
                  className="input"
                  value={qMat}
                  onChange={(e) => setQMat(e.target.value)}
                  placeholder="Ex. ESP/25/IRT/031"
                />
              </div>
              <div className="md:col-span-4">
                <SelectField
                  id="export-att-dept"
                  label="Département"
                  value={fDept}
                  onChange={setFDept}
                  options={deptOptions}
                />
              </div>
              <div className="md:col-span-3">
                <SelectField
                  id="export-att-annee"
                  label="Année"
                  value={fAnnee}
                  onChange={setFAnnee}
                  options={anneeOptions}
                />
              </div>
              <div className="md:col-span-12">
                <SelectField
                  id="export-att-eleve"
                  label="Étudiant"
                  value={eleve.id}
                  onChange={(v) => {
                    setEleveId(v);
                    setSemIndex(0);
                  }}
                  options={(elevesFiltres.length ? elevesFiltres : eleves).slice(0, 120).map((e) => ({
                    value: e.id,
                    label: `${e.matricule} — ${e.nom} ${e.prenom}`,
                  }))}
                />
                <p className="mt-2 text-xs text-text-light">
                  {elevesFiltres.length} résultat{elevesFiltres.length > 1 ? 's' : ''} selon les filtres.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              variant="secondary"
              onClick={() => downloadAttestationScolarite(eleve)}
              icon={FileDown}
              iconPosition="right"
            >
              Scolarité (Word)
            </Button>
            <Button
              variant="primary"
              onClick={() => downloadAttestationParcoursIrt(eleve)}
              icon={FileDown}
              iconPosition="right"
            >
              Parcours IRT (Word)
            </Button>
            <Button variant="gold" onClick={() => printAttestationParcoursIrt(eleve)} icon={FileType} iconPosition="right">
              Parcours IRT (PDF / impression)
            </Button>
          </div>
        </div>
      )}

      {onglet === 'releve' && eleve && (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-light-gray bg-white p-4 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Sélection étudiant</p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-5">
                <label className="label">Matricule</label>
                <input
                  className="input"
                  value={qMat}
                  onChange={(e) => setQMat(e.target.value)}
                  placeholder="Ex. ESP/25/IRT/031"
                />
              </div>
              <div className="md:col-span-4">
                <SelectField
                  id="export-rel-dept"
                  label="Département"
                  value={fDept}
                  onChange={setFDept}
                  options={deptOptions}
                />
              </div>
              <div className="md:col-span-3">
                <SelectField
                  id="export-rel-annee"
                  label="Année"
                  value={fAnnee}
                  onChange={setFAnnee}
                  options={anneeOptions}
                />
              </div>
              <div className="md:col-span-12">
                <SelectField
                  id="export-rel-eleve"
                  label="Étudiant"
                  value={eleve.id}
                  onChange={(v) => {
                    setEleveId(v);
                    setSemIndex(0);
                  }}
                  options={(elevesFiltres.length ? elevesFiltres : eleves).slice(0, 120).map((e) => ({
                    value: e.id,
                    label: `${e.matricule} — ${e.nom} ${e.prenom}`,
                  }))}
                />
                <p className="mt-2 text-xs text-text-light">
                  {elevesFiltres.length} résultat{elevesFiltres.length > 1 ? 's' : ''} selon les filtres.
                </p>
              </div>
            </div>
          </div>

          {semestreOptions.length > 0 && (
            <>
              <SelectField
                id="export-rel-sem"
                label="Semestre"
                value={String(semIdxEffectif)}
                onChange={(v) => setSemIndex(Number(v))}
                options={semestreOptions.map((o) => ({ value: String(o.i), label: o.label }))}
              />
            </>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              variant="primary"
              onClick={() => downloadReleveSemestre(eleve, semIdxEffectif)}
              icon={FileDown}
              iconPosition="right"
            >
              Relevé (Word)
            </Button>
            <Button
              variant="secondary"
              onClick={() => exportReleveXlsx(eleve, semIdxEffectif)}
              icon={FileSpreadsheet}
              iconPosition="right"
            >
              Relevé (Excel)
            </Button>
            <Button
              variant="gold"
              onClick={() => printReleveSemestreHtml(eleve, semIdxEffectif)}
              icon={FileType}
              iconPosition="right"
            >
              Aperçu PDF (impression)
            </Button>
          </div>
        </div>
      )}
    </FullScreenLayer>
  );
}
