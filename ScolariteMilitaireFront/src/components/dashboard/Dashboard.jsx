import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Clock,
  UserPlus,
  ChevronRight,
  CalendarDays,
} from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import { useFetch } from '../../hooks/useFetch';
import { eleveService } from '../../services/eleveService';
import {
  eleveNeedsAttention,
  alertLabelForEleve,
  repartitionParFiliere,
} from '../../utils/dashboardStats';

function KpiBlock({ icon: Icon, label, value, hint, accent = 'navy' }) {
  const isGold = accent === 'gold';
  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-light-gray bg-white p-5 shadow-sm transition duration-200 hover:shadow-card-hover md:p-6 ${
        isGold ? 'hover:border-gold/40' : 'hover:border-navy/25'
      }`}
    >
      <div
        className={`absolute left-0 top-0 h-full w-1 rounded-l-2xl ${isGold ? 'bg-gold' : 'bg-navy'}`}
        aria-hidden
      />
      <div className="pl-3">
        <div className="flex items-start justify-between gap-3">
          <div
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border ${
              isGold
                ? 'border-gold/30 bg-amber-50 text-gold-700'
                : 'border-navy/15 bg-navy-50 text-navy'
            }`}
          >
            <Icon size={22} strokeWidth={1.75} />
          </div>
        </div>
        <p className="mt-4 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-text-light">{label}</p>
        <p className="mt-1 font-sans text-3xl font-semibold tabular-nums tracking-tight text-navy-900 md:text-[2.1rem]">
          {value}
        </p>
        {hint ? <p className="mt-2 text-sm leading-snug text-text-light">{hint}</p> : null}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: rows, loading, error } = useFetch(() => eleveService.list({}), []);

  const kpis = useMemo(() => {
    const list = rows ?? [];
    return {
      total: list.length,
      dossiersASurveiller: list.filter(eleveNeedsAttention).length,
    };
  }, [rows]);

  const parFiliere = useMemo(() => repartitionParFiliere(rows ?? []), [rows]);

  const aSurveiller = useMemo(() => {
    const list = rows ?? [];
    return [...list].filter(eleveNeedsAttention).slice(0, 5);
  }, [rows]);

  const formatted = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="relative min-h-0">
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -left-24 -top-32 h-72 w-72 rounded-full bg-gold/15 blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-slate-200/35 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage: `linear-gradient(rgba(15,23,42,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.05) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative space-y-8 md:space-y-10 lg:space-y-12">
        <header className="overflow-hidden rounded-3xl border border-light-gray bg-white p-6 shadow-card md:p-8 lg:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-light-gray bg-white px-3 py-1.5 text-2xs font-semibold uppercase tracking-[0.18em] text-text-light shadow-sm">
                <CalendarDays size={12} className="text-gold-700" />
                {formatted}
              </div>
              <h1 className="page-title !text-4xl !leading-[1.05] sm:!text-5xl md:!text-6xl !text-slate-900">
                Tableau de bord
              </h1>
              <p className="page-subtitle !mt-2 max-w-2xl !text-sm !leading-relaxed text-text-light md:!text-base">
                Effectifs, inscriptions, présence et validation des dossiers.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/eleves"
                className="btn btn-primary btn-lg inline-flex min-w-[10rem] items-center justify-center gap-2 shadow-sm"
              >
                <UserPlus size={20} />
                <span>Étudiants</span>
              </Link>
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            Impossible de charger les données du tableau de bord. Vérifiez la connexion à l&apos;API et votre session.
          </div>
        ) : null}

        <section aria-label="Indicateurs" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiBlock
            icon={Users}
            label="Étudiants"
            value={loading ? '…' : kpis.total.toLocaleString('fr-FR')}
            accent="navy"
            hint="Effectifs selon la liste chargée depuis le SI."
          />
          <KpiBlock
            icon={Clock}
            label="Dossiers à compléter"
            value={loading ? '…' : String(kpis.dossiersASurveiller)}
            accent="gold"
            hint="Coordonnées type téléphone / e-mail placeholder ou manquantes."
          />
        </section>

        <div className="grid min-h-0 grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          <div className="min-w-0 lg:col-span-7 xl:col-span-8">
            <Card
              className="overflow-hidden"
              bodyClassName="!p-5 md:!p-6"
              title="Répartition par filière"
              subtitle="Basée sur les départements enregistrés pour chaque étudiant."
              accent="gold"
            >
              <div className="flex flex-col gap-3">
                {loading ? (
                  <p className="text-sm text-text-light">Chargement…</p>
                ) : parFiliere.length === 0 ? (
                  <p className="text-sm text-text-light">Aucun étudiant à afficher.</p>
                ) : (
                  parFiliere.map((f) => (
                    <div
                      key={f.filiere}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-light-gray bg-white p-4"
                    >
                      <span className="text-sm font-medium text-slate-900">{f.filiere}</span>
                      <span className="text-sm font-semibold text-amber-700">
                        {f.dossiersComplets} dossiers complets / {f.dossiersASurveiller} à compléter
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <div className="min-w-0 lg:col-span-5 xl:col-span-4">
            <Card
              bodyClassName="!p-4 md:!p-5"
              title="À surveiller"
              actions={
                <Link
                  to="/eleves"
                  className="group inline-flex items-center gap-1 text-sm font-semibold text-navy hover:text-esp-red"
                >
                  Tout voir
                  <ChevronRight size={16} className="transition group-hover:translate-x-0.5" />
                </Link>
              }
            >
              <ul className="flex flex-col gap-2">
                {loading ? (
                  <li className="text-sm text-text-light">Chargement…</li>
                ) : aSurveiller.length === 0 ? (
                  <li className="text-sm text-text-light">Aucun dossier à compléter détecté.</li>
                ) : (
                  aSurveiller.map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center gap-3 rounded-xl border border-light-gray bg-white p-3 transition hover:border-slate-300 hover:bg-off-white"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy-gradient text-sm font-bold text-white ring-1 ring-slate-200">
                        {e.prenom?.[0]}
                        {e.nom?.[0]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900">
                          {e.nom} {e.prenom}
                        </p>
                        <p className="truncate text-2xs text-text-light">{e.matricule}</p>
                      </div>
                      <Badge tone="alerte" className="!text-2xs">
                        {alertLabelForEleve(e)}
                      </Badge>
                    </li>
                  ))
                )}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
