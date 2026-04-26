import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, UserPlus, Search, Filter, Eye, ListChecks, ClipboardList } from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import SelectField from '../components/common/SelectField';
import DataTable from '../components/common/DataTable';
import DemandeReviewView from '../components/inscriptions/DemandeReviewView';
import FullScreenLayer from '../components/common/FullScreenLayer';
import { useFetch } from '../hooks/useFetch';
import { inscriptionDemandeService } from '../services/inscriptionDemandeService';
import { statsInscriptionsFromDemandes } from '../data/inscriptionDemandesMock';
import { FILIERES, NIVEAUX_SCOLARITE } from '../utils/constants';

function KpiComp({ label, value, hint }) {
  return (
    <div className="border-b border-light-gray py-2 last:border-0 sm:border-0 sm:py-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">{label}</p>
      <p className="mt-0.5 font-mono text-xl font-semibold text-slate-900 tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-text-light">{hint}</p>}
    </div>
  );
}

export default function InscriptionsPage() {
  const [filters, setFilters] = useState({
    q: '',
    departement: '',
    annee: '',
    type: 'tous',
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState(null);
  const [banner, setBanner] = useState(null);

  const { data: demandes, loading } = useFetch(
    () => inscriptionDemandeService.list(filters),
    [filters, refreshKey],
  );

  const stats = useMemo(
    () => statsInscriptionsFromDemandes(inscriptionDemandeService.getAllSync()),
    [refreshKey],
  );

  const selectedSync = useMemo(() => {
    if (!selected?.id) return null;
    return inscriptionDemandeService.getById(selected.id) ?? selected;
  }, [selected?.id, refreshKey]);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 8000);
    return () => clearTimeout(t);
  }, [banner]);

  const departementOptions = [
    { value: '', label: 'Tous les départements' },
    ...FILIERES.map((f) => ({ value: f, label: f })),
  ];

  const anneeOptions = [
    { value: '', label: 'Toutes les années' },
    ...NIVEAUX_SCOLARITE.map((x) => ({ value: x, label: x })),
  ];

  const typeOptions = [
    { value: 'tous', label: 'Tous les types' },
    { value: 'nouvelle_inscription', label: 'Nouvelle inscription' },
    { value: 'reinscription', label: 'Réinscription' },
  ];

  const columns = [
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      accessor: (r) => r.type,
      render: (r) => (
        <Badge tone={r.type === 'reinscription' ? 'navy' : 'gold'}>
          {r.type === 'reinscription' ? 'Réinscription' : 'Nouvelle'}
        </Badge>
      ),
    },
    {
      key: 'matricule',
      label: 'Matricule',
      sortable: true,
      accessor: (r) => r.candidat.matricule || '—',
      render: (r) => (
        <span className="font-mono text-sm text-slate-900">
          {r.candidat.matricule && String(r.candidat.matricule).trim() !== '' ? r.candidat.matricule : '—'}
        </span>
      ),
    },
    {
      key: 'nom',
      label: 'Candidat',
      sortable: true,
      accessor: (r) => `${r.candidat.nom} ${r.candidat.prenom}`,
      render: (r) => (
        <div>
          <p className="font-medium text-slate-900">
            {r.candidat.nom} {r.candidat.prenom}
          </p>
          <p className="text-xs text-text-light">NNI {r.candidat.nni}</p>
        </div>
      ),
    },
    {
      key: 'filiere',
      label: 'Département',
      sortable: true,
      accessor: (r) => r.candidat.filiere,
      render: (r) => <span className="text-sm text-slate-900">{r.candidat.filiere}</span>,
    },
    {
      key: 'niveau',
      label: 'Année',
      sortable: true,
      accessor: (r) => r.candidat.scolarite?.niveau ?? '',
      render: (r) => <span className="text-slate-900">{r.candidat.scolarite?.niveau ?? '—'}</span>,
    },
    {
      key: 'statutPieces',
      label: 'Pièces',
      render: (r) => (
        <Badge tone={r.statutPieces === 'complet' ? 'valide' : 'alerte'}>
          {r.statutPieces === 'complet' ? 'Complet' : 'Incomplet'}
        </Badge>
      ),
    },
    {
      key: 'decision',
      label: 'Décision',
      sortable: true,
      accessor: (r) => r.decision,
      render: (r) => (
        <Badge
          tone={
            r.decision === 'acceptee' ? 'valide' : r.decision === 'refusee' ? 'refuse' : 'en_attente'
          }
        >
          {r.decision === 'acceptee' ? 'Acceptée' : r.decision === 'refusee' ? 'Refusée' : 'En attente'}
        </Badge>
      ),
    },
    {
      key: 'date',
      label: 'Soumission',
      sortable: true,
      accessor: (r) => r.dateSoumission,
      render: (r) => (
        <span className="text-sm text-text-light">
          {new Date(r.dateSoumission).toLocaleDateString('fr-FR')}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <Button
          variant="secondary"
          size="sm"
          icon={Eye}
          onClick={(e) => {
            e.stopPropagation();
            setSelected(r);
          }}
        >
          Ouvrir
        </Button>
      ),
      align: 'right',
    },
  ];

  const pendingCount = useMemo(
    () => inscriptionDemandeService.getAllSync().filter((d) => d.decision === 'en_attente').length,
    [refreshKey],
  );

  return (
    <div className="space-y-6">
      {banner && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            banner.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          {banner.text}
        </div>
      )}

      <nav className="text-sm text-slate-500">
        <Link to="/dashboard" className="hover:text-navy">
          Tableau de bord
        </Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-slate-900">Inscriptions (mobile)</span>
      </nav>

      <div className="flex flex-col gap-4 border-b border-light-gray pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            Inscriptions & réinscriptions
          </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-text-light">
            Direction de la scolarité — validation des demandes transmises par l’application mobile. Contrôle des
            pièces, décision, création de compte ou refus notifié.
          </p>
        </div>
        <div className="flex shrink-0 items-baseline gap-2 rounded-lg border border-light-gray bg-off-white px-4 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">File active</span>
          <span className="font-mono text-2xl font-semibold text-slate-900">{pendingCount}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="!bg-white" title="Synthèse" subtitle="Période en cours (démo)">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-1">
            <KpiComp
              label="Confirmées (réf.)"
              value={stats.confirmeesTotal.toLocaleString('fr-FR')}
              hint="Rattaché effectif annuel"
            />
            <KpiComp
              label="En attente"
              value={stats.enFile.toLocaleString('fr-FR')}
              hint="Décision requise"
            />
            <KpiComp
              label="Pièces à relancer"
              value={stats.aRelancer.toLocaleString('fr-FR')}
              hint="Dossiers incomplets"
            />
            <KpiComp
              label="Traitées (session)"
              value={stats.traiteesSession.toLocaleString('fr-FR')}
              hint="Acceptées + refusées"
            />
          </div>
        </Card>
        <div className="sm:col-span-1 lg:col-span-3">
          <div className="grid h-full min-h-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2">
            <Card
              className="h-full !bg-white"
              title="Processus de validation"
              subtitle="Ordre de traitement côté administration"
            >
              <ol className="space-y-3 text-sm text-slate-700">
                {[
                  { t: 'Réception (API app)', i: 1, Icon: ClipboardList },
                  { t: 'Identité & pièces (contrôle)', i: 2, Icon: ListChecks },
                  { t: 'Décision (inscription compte / refus)', i: 3, Icon: CheckCircle2 },
                  { t: 'Notification candidat (e-mail + SMS/WA)', i: 4, Icon: UserPlus },
                ].map(({ t, i, Icon }) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border border-light-gray bg-off-white text-xs font-bold text-slate-700">
                      {i}
                    </span>
                    <span>
                      <Icon size={12} className="mr-1 inline -translate-y-px text-amber-600/80" />
                      {t}
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
            <Card className="h-full !bg-white" title="Aide" subtitle="Rappels opérationnels">
              <ul className="list-disc space-y-2 pl-4 text-sm text-text-light">
                <li>Les pièces « reçues » doivent être vérifiées une à une dans le dossier détaillé.</li>
                <li>Le compte @esp.mr est généré par le système à l’acceptation (hors saisie candidat, nouveaux).</li>
                <li>Conservez une trace du motif en cas de refus (déontologie / traçabilité).</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-12">
          <div className="overflow-hidden rounded-xl border border-light-gray bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-light-gray px-4 py-3 sm:px-5">
              <h2 className="font-medium text-slate-900">Filtres de recherche</h2>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <Filter size={13} /> {loading ? 'Chargement…' : 'Prêt'}
              </span>
            </div>
            <div className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
                <div className="min-w-0 flex-1 lg:min-w-[200px]">
                  <span className="label">Recherche</span>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      className="input pl-9"
                      placeholder="Nom, prénom, matricule, NNI…"
                      value={filters.q}
                      onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                    />
                  </div>
                </div>
                <div className="w-full min-w-[200px] max-w-sm flex-1">
                  <SelectField
                    label="Département"
                    value={filters.departement}
                    onChange={(v) => setFilters({ ...filters, departement: v })}
                    options={departementOptions}
                    id="ins-filter-dept"
                  />
                </div>
                <div className="w-full min-w-[180px] max-w-xs">
                  <SelectField
                    label="Année (niveau)"
                    value={filters.annee}
                    onChange={(v) => setFilters({ ...filters, annee: v })}
                    options={anneeOptions}
                    id="ins-filter-annee"
                  />
                </div>
                <div className="w-full min-w-[180px] max-w-xs">
                  <SelectField
                    label="Type de demande"
                    value={filters.type}
                    onChange={(v) => setFilters({ ...filters, type: v })}
                    options={typeOptions}
                    id="ins-filter-type"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-12">
          <div className="overflow-hidden rounded-xl border border-light-gray bg-white">
            <div className="border-b border-light-gray px-4 py-3 sm:px-5">
              <h2 className="text-base font-medium text-slate-900">File d’attente</h2>
              <p className="text-xs text-slate-500">Demandes soumises via l’application — ouvrez un dossier pour le contrôler en plein écran.</p>
            </div>
            <div className="p-2 sm:p-3">
              <DataTable
                columns={columns}
                rows={demandes ?? []}
                pageSize={10}
                empty="Aucune demande pour ces critères."
              />
            </div>
          </div>
        </div>
      </div>

      {/* طبقة كاملة فوق القائمة (بدون مودال صغير) */}
      <FullScreenLayer
        open={!!selectedSync}
        onClose={() => {
          setSelected(null);
          setRefreshKey((k) => k + 1);
        }}
        chrome={false}
        className="bg-transparent ring-0 shadow-none"
        contentClassName="bg-white"
      >
        <div className="flex min-h-screen flex-col">
          <DemandeReviewView
            demande={selectedSync}
            onBack={() => {
              setSelected(null);
              setRefreshKey((k) => k + 1);
            }}
            onAfterMutation={() => {
              setSelected((s) => (s ? inscriptionDemandeService.getById(s.id) : null));
              setRefreshKey((k) => k + 1);
            }}
            onAccepter={async () => {
              const res = await inscriptionDemandeService.accepter(selectedSync.id);
              if (res.ok) {
                setBanner({
                  type: 'ok',
                  text: `Compte créé — matricule ${res.matricule} · e-mail institutionnel : ${res.emailPro}. Identifiants transmis (démo) par notification.`,
                });
                setSelected(null);
              } else {
                setBanner({ type: 'err', text: res.error || 'Action impossible.' });
              }
              setRefreshKey((k) => k + 1);
            }}
            onRefuser={async (payload) => {
              const res = await inscriptionDemandeService.refuser(selectedSync.id, payload);
              if (res.ok) {
                setBanner({ type: 'ok', text: 'Refus enregistré. Message transmis (simulation) sur les canaux indiqués.' });
                setSelected(null);
              }
              setRefreshKey((k) => k + 1);
            }}
          />
        </div>
      </FullScreenLayer>
    </div>
  );
}
