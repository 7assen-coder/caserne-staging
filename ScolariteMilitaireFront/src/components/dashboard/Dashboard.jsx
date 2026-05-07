import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserPlus,
  ChevronRight,
  CalendarDays,
  Globe,
  ShieldCheck,
  Building2,
  AlertCircle,
  CircleDot,
  GraduationCap,
  Upload,
  FileDown,
  UserCog,
  ArrowRight,
} from 'lucide-react';
import EspLogo from '../common/EspLogo';
import { useFetch } from '../../hooks/useFetch';
import { useAuth } from '../../hooks/useAuth';
import { eleveService } from '../../services/eleveService';
import {
  eleveNeedsAttention,
  alertLabelForEleve,
  repartitionParFiliere,
} from '../../utils/dashboardStats';
import { ROLE_LABEL, getCanonicalRole, getPermissions } from '../../utils/userRole';
import { getCurrentAcademicYear } from '../../utils/anneeUniversitaire';

function isInMobilite(e) {
  const m = e?.mobilite;
  return Boolean(m && (m.type || m.etablissement || m.specialite));
}

function QuickAction({ icon: Icon, title, subtitle, to, variant = 'navy', disabled }) {
  const variants = {
    navy: {
      base: 'bg-gradient-to-br from-navy-700 to-navy-900 text-white border-navy-900',
      icon: 'bg-white/10 text-gold ring-white/15',
      title: 'text-white',
      subtitle: 'text-slate-300',
      arrow: 'text-gold',
    },
    gold: {
      base: 'bg-gradient-to-br from-gold to-gold-500 text-dark-navy border-gold-600',
      icon: 'bg-dark-navy/20 text-dark-navy ring-dark-navy/30',
      title: 'text-dark-navy',
      subtitle: 'text-dark-navy/80',
      arrow: 'text-dark-navy',
    },
    light: {
      base: 'bg-white text-slate-900 border-light-gray hover:border-navy/30',
      icon: 'bg-navy-50 text-navy ring-navy/15',
      title: 'text-slate-900',
      subtitle: 'text-slate-500',
      arrow: 'text-navy',
    },
  };
  const v = variants[variant] || variants.light;
  if (disabled) {
    return (
      <div
        aria-disabled
        className={`group relative flex flex-col gap-3 rounded-2xl border p-4 opacity-50 sm:p-5 ${v.base}`}
      >
        <span className={`grid h-11 w-11 place-items-center rounded-xl ring-1 ${v.icon}`}>
          <Icon size={20} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className={`text-[0.95rem] font-semibold leading-tight ${v.title}`}>{title}</p>
          <p className={`mt-1 truncate text-xs ${v.subtitle}`}>Accès non autorisé pour votre rôle.</p>
        </div>
      </div>
    );
  }
  return (
    <Link
      to={to}
      className={`group relative flex flex-col gap-3 overflow-hidden rounded-2xl border p-4 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-pop sm:p-5 ${v.base}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-11 w-11 place-items-center rounded-xl ring-1 ${v.icon}`}>
          <Icon size={20} aria-hidden />
        </span>
        <ChevronRight
          size={18}
          className={`transition group-hover:translate-x-0.5 ${v.arrow}`}
          aria-hidden
        />
      </div>
      <div className="min-w-0">
        <p className={`text-[0.95rem] font-semibold leading-tight ${v.title}`}>{title}</p>
        <p className={`mt-1 truncate text-xs ${v.subtitle}`}>{subtitle}</p>
      </div>
    </Link>
  );
}

function Kpi({ icon: Icon, label, value, hint, accent = 'navy', loading }) {
  const accents = {
    navy: { bar: 'bg-gradient-to-b from-navy-500 to-navy-900', icon: 'bg-navy text-gold' },
    gold: { bar: 'bg-gradient-to-b from-gold-300 to-gold-600', icon: 'bg-gold text-dark-navy' },
    emerald: { bar: 'bg-gradient-to-b from-emerald-400 to-emerald-700', icon: 'bg-emerald-700 text-white' },
    red: { bar: 'bg-gradient-to-b from-amber-400 to-red-600', icon: 'bg-brand-red text-white' },
  };
  const a = accents[accent] || accents.navy;
  return (
    <div className="group relative flex min-h-[8.5rem] flex-col overflow-hidden rounded-2xl border border-light-gray bg-white/95 shadow-card backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className={`absolute inset-y-0 left-0 w-1 ${a.bar}`} aria-hidden />
      <div className="flex h-full flex-col justify-between gap-3 p-4 pl-5 sm:p-5 sm:pl-6">
        <span className={`grid h-10 w-10 place-items-center rounded-lg shadow-inset ring-1 ring-black/5 ${a.icon}`}>
          <Icon size={18} strokeWidth={2.1} aria-hidden />
        </span>
        <div>
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="mt-0.5 font-sans text-[2rem] font-bold leading-none tabular-nums tracking-tight text-navy-900">
            {loading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-slate-200" /> : value}
          </p>
          {hint ? <p className="mt-1.5 text-xs leading-snug text-slate-500">{hint}</p> : null}
        </div>
      </div>
    </div>
  );
}

function FiliereRow({ row, max, total }) {
  const completePct = total > 0 ? (row.dossiersComplets / total) * 100 : 0;
  const widthPct = max > 0 ? Math.max(10, (total / max) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-sm font-semibold text-slate-900">{row.filiere}</span>
        <span className="shrink-0 tabular-nums text-xs text-slate-500">
          <span className="font-bold text-navy-900">{total}</span> · {row.dossiersComplets} OK · {row.dossiersASurveiller} ⚠
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
        <div
          className="absolute inset-y-0 left-0 flex h-full overflow-hidden rounded-full"
          style={{ width: `${widthPct}%` }}
        >
          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600" style={{ width: `${completePct}%` }} />
          <div className="h-full bg-gradient-to-r from-gold-300 to-gold-500" style={{ width: `${100 - completePct}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, fonction } = useAuth();
  const role = getCanonicalRole(fonction);
  const perms = getPermissions(role);

  const { data: rows, loading, error } = useFetch(() => eleveService.list({}), []);
  const list = rows ?? [];

  const kpis = useMemo(() => {
    const dossiersASurveiller = list.filter(eleveNeedsAttention).length;
    const enMobilite = list.filter(isInMobilite).length;
    const compagnies = new Set(list.map((e) => e.dossierMilitaire?.compagnie).filter(Boolean));
    const completionPct =
      list.length > 0 ? Math.round(((list.length - dossiersASurveiller) / list.length) * 100) : 0;
    return {
      total: list.length,
      dossiersASurveiller,
      enMobilite,
      compagnies: compagnies.size,
      completionPct,
    };
  }, [list]);

  const parFiliere = useMemo(() => repartitionParFiliere(list), [list]);
  const maxFiliere = useMemo(
    () => parFiliere.reduce((m, r) => Math.max(m, r.dossiersComplets + r.dossiersASurveiller), 0),
    [parFiliere],
  );

  const aSurveiller = useMemo(() => list.filter(eleveNeedsAttention).slice(0, 4), [list]);
  const mobilitesRecentes = useMemo(() => list.filter(isInMobilite).slice(0, 4), [list]);

  const repartitionCompagnies = useMemo(() => {
    const map = new Map();
    list.forEach((e) => {
      const c = e.dossierMilitaire?.compagnie || 'Non assignée';
      map.set(c, (map.get(c) || 0) + 1);
    });
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([compagnie, total]) => ({ compagnie, total }));
  }, [list]);

  const today = new Date();
  const formattedDate = today.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const hour = today.getHours();
  const greeting =
    hour < 5 ? 'Bonne nuit' : hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const userPrenom = user?.prenom || user?.first_name || 'Officier';
  const userNom = user?.nom || user?.last_name || '';
  const anneeUni = getCurrentAcademicYear();

  return (
    <div className="space-y-6 md:space-y-8">
      <header className="relative overflow-hidden rounded-3xl bg-hero-fade text-white shadow-pop ring-1 ring-navy-900/40">
        <div
          className="pointer-events-none absolute inset-0 bg-grid-faint"
          style={{ backgroundSize: '24px 24px' }}
          aria-hidden
        />
        <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-gold/15 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -left-20 -bottom-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden />

        <div className="relative px-5 pb-7 pt-6 sm:px-7 sm:pb-8 sm:pt-7 md:px-10 md:pb-10 md:pt-9">
          <div className="min-w-0 max-w-3xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <Link to="/dashboard" className="flex min-w-0 items-center gap-3 outline-none ring-offset-2 ring-offset-navy-900 focus-visible:ring-2 focus-visible:ring-gold">
                  <EspLogo className="h-10 w-10 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/80">Scolarité</p>
                    <p className="truncate text-base font-semibold text-white">ESP Militaire</p>
                  </div>
                </Link>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-100">
                    <CalendarDays size={14} aria-hidden className="shrink-0 opacity-90" />
                    <span className="capitalize">{formattedDate}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-gold/35 bg-gold/10 px-2.5 py-1.5 text-xs font-semibold text-gold-200">
                    <ShieldCheck size={14} aria-hidden className="shrink-0" />
                    {ROLE_LABEL[role]}
                  </span>
                  <span className="inline-flex w-full items-center justify-center rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-200 sm:w-auto">
                    Année {anneeUni}
                  </span>
                </div>
            </div>

            <h1 className="mt-5 font-sans text-[1.7rem] font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-[2.65rem]">
                {greeting},{' '}
                <span className="text-gold">
                  {userPrenom}
                  {userNom ? ` ${userNom}` : ''}
                </span>
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm text-slate-300 sm:text-base">
                Synthèse des indicateurs ci-dessous.
              </p>
            </div>
          </div>
        <div className="h-1.5 w-full bg-esp-ribbon" aria-hidden />
      </header>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-card">
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            Impossible de charger les données du tableau de bord. Vérifiez la connexion à l’API et votre session.
          </span>
        </div>
      ) : null}

      <section aria-label="Actions rapides">
        <div className="mb-3 flex items-end justify-between gap-2">
          <div>
            <h2 className="font-sans text-base font-bold uppercase tracking-[0.14em] text-slate-700 sm:text-lg">
              Actions rapides
            </h2>
            <div className="mt-1 h-0.5 w-12 rounded-full bg-gold" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <QuickAction
            icon={UserPlus}
            title="Nouvel étudiant"
            subtitle="Créer un dossier complet"
            to="/eleves/nouveau"
            variant="navy"
            disabled={!perms.canCreateStudent}
          />
          <QuickAction
            icon={Globe}
            title="Mobilité (DD / SE)"
            subtitle="Étudiants en double diplôme ou échange"
            to="/eleves/mobilite"
            variant="gold"
            disabled={!perms.canCreateMobilite}
          />
          <QuickAction
            icon={Upload}
            title="Importer"
            subtitle="Liste d’étudiants en masse"
            to="/eleves/import"
            variant="light"
          />
          <QuickAction
            icon={FileDown}
            title="Exporter"
            subtitle="Excel, PDF, Word"
            to="/eleves/export"
            variant="light"
          />
          <QuickAction
            icon={UserCog}
            title="Nouvel utilisateur"
            subtitle="Compte avec rôle (admin, encadrant…)"
            to="/utilisateurs/nouveau"
            variant="light"
            disabled={perms.canCreateUserRoles.length === 0}
          />
        </div>
      </section>

      <section aria-label="Indicateurs">
        <div className="mb-3 flex items-end justify-between gap-2">
          <div>
            <h2 className="font-sans text-base font-bold uppercase tracking-[0.14em] text-slate-700 sm:text-lg">
              Indicateurs clés
            </h2>
            <div className="mt-1 h-0.5 w-12 rounded-full bg-gold" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Kpi
            icon={Users}
            label="Étudiants"
            value={kpis.total.toLocaleString('fr-FR')}
            hint={loading ? null : `${kpis.completionPct}% dossiers complets`}
            accent="navy"
            loading={loading}
          />
          <Kpi
            icon={Globe}
            label="En mobilité"
            value={kpis.enMobilite.toLocaleString('fr-FR')}
            hint="Double diplôme + Échange"
            accent="gold"
            loading={loading}
          />
          <Kpi
            icon={AlertCircle}
            label="À compléter"
            value={kpis.dossiersASurveiller.toLocaleString('fr-FR')}
            hint="Coordonnées manquantes"
            accent="red"
            loading={loading}
          />
          <Kpi
            icon={Building2}
            label="Compagnies"
            value={kpis.compagnies.toLocaleString('fr-FR')}
            hint="Compagnies actives"
            accent="emerald"
            loading={loading}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 md:gap-6 lg:grid-cols-12">
        <section className="lg:col-span-7 xl:col-span-8">
          <div className="overflow-hidden rounded-2xl border border-light-gray bg-white shadow-card">
            <header className="flex items-start justify-between gap-3 border-b border-light-gray bg-gradient-to-r from-navy-50 to-white px-5 py-4">
              <div className="min-w-0">
                <h3 className="font-sans text-sm font-bold uppercase tracking-[0.14em] text-navy">
                  Répartition par filière
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  <span className="font-semibold text-emerald-700">●</span> dossiers complets ·{' '}
                  <span className="font-semibold text-gold-700">●</span> à compléter
                </p>
              </div>
              <Link
                to="/eleves"
                className="inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-navy transition hover:bg-navy-50"
              >
                Voir tout <ChevronRight size={14} />
              </Link>
            </header>
            <div className="px-5 py-5">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                      <div className="h-2 w-full animate-pulse rounded-full bg-slate-100" />
                    </div>
                  ))}
                </div>
              ) : parFiliere.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">Aucun étudiant à afficher.</p>
              ) : (
                <ul className="space-y-4">
                  {parFiliere.map((row) => {
                    const total = row.dossiersComplets + row.dossiersASurveiller;
                    return (
                      <li key={row.filiere}>
                        <FiliereRow row={row} max={maxFiliere} total={total} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-5 md:space-y-6 lg:col-span-5 xl:col-span-4">
          <div className="overflow-hidden rounded-2xl border border-light-gray bg-white shadow-card">
            <header className="flex items-start justify-between gap-3 border-b border-light-gray bg-gradient-to-r from-amber-50 to-white px-5 py-4">
              <div>
                <h3 className="font-sans text-sm font-bold uppercase tracking-[0.14em] text-amber-800">
                  Dossiers à compléter
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Priorité : coordonnées manquantes ou invalides.
                </p>
              </div>
              <Link
                to="/eleves"
                className="inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
              >
                Tout voir <ChevronRight size={14} />
              </Link>
            </header>
            <ul className="divide-y divide-light-gray">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <li key={i} className="flex items-center gap-3 px-5 py-3">
                    <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-100" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                      <div className="h-2.5 w-1/3 animate-pulse rounded bg-slate-100" />
                    </div>
                  </li>
                ))
              ) : aSurveiller.length === 0 ? (
                <li className="px-5 py-6 text-center text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1.5 text-emerald-700">
                    <CircleDot size={12} /> Aucun dossier à compléter
                  </span>
                </li>
              ) : (
                aSurveiller.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy-gradient text-xs font-bold text-gold ring-1 ring-navy-700">
                      {(e.prenom?.[0] || '').toUpperCase()}
                      {(e.nom?.[0] || '').toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {e.nom} {e.prenom}
                      </p>
                      <p className="truncate text-xs text-slate-500 tabular-nums">{e.matricule || '—'}</p>
                    </div>
                    <span className="hidden shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200 sm:inline-flex">
                      {alertLabelForEleve(e)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="overflow-hidden rounded-2xl border border-light-gray bg-white shadow-card">
            <header className="flex items-start justify-between gap-3 border-b border-light-gray bg-gradient-to-r from-gold-100/60 to-white px-5 py-4">
              <div>
                <h3 className="font-sans text-sm font-bold uppercase tracking-[0.14em] text-gold-700">
                  Mobilité récente
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Aperçu des mobilités DD / SE.
                </p>
              </div>
              {perms.canCreateMobilite ? (
                <Link
                  to="/eleves/mobilite"
                  className="inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-gold-700 transition hover:bg-gold-100/60"
                >
                  Tout voir <ChevronRight size={14} />
                </Link>
              ) : null}
            </header>
            <ul className="divide-y divide-light-gray">
              {loading ? (
                [1, 2].map((i) => (
                  <li key={i} className="flex items-center gap-3 px-5 py-3">
                    <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-100" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                      <div className="h-2.5 w-1/3 animate-pulse rounded bg-slate-100" />
                    </div>
                  </li>
                ))
              ) : mobilitesRecentes.length === 0 ? (
                <li className="px-5 py-6 text-center text-sm text-slate-500">
                  Aucune mobilité enregistrée.{' '}
                  {perms.canCreateMobilite ? (
                    <Link to="/eleves/mobilite" className="font-semibold text-navy hover:underline">
                      Ajouter
                    </Link>
                  ) : null}
                </li>
              ) : (
                mobilitesRecentes.map((e) => {
                  const t = e.mobilite?.type || '';
                  const isDD = t === 'Double diplôme';
                  return (
                    <li key={e.id} className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50">
                      <span
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ring-1 ${
                          isDD
                            ? 'bg-amber-50 text-amber-700 ring-amber-200'
                            : 'bg-sky-50 text-sky-700 ring-sky-200'
                        }`}
                      >
                        <Globe size={16} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {e.nom} {e.prenom}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {e.mobilite?.etablissement || '—'}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums ring-1 ${
                          isDD
                            ? 'bg-amber-50 text-amber-800 ring-amber-200'
                            : 'bg-sky-50 text-sky-800 ring-sky-200'
                        }`}
                      >
                        {isDD ? 'DD' : t === 'Semestre d’échange' ? 'SE' : '—'}
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </aside>
      </div>

      {repartitionCompagnies.length > 0 ? (
        <section className="rounded-xl border border-light-gray bg-white shadow-card">
          <header className="flex flex-col gap-3 border-b border-light-gray px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-sans text-base font-semibold text-slate-900">Répartition par compagnie</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Effectifs des étudiants groupés par compagnie.
              </p>
            </div>
            <Link
              to="/eleves"
              className="inline-flex shrink-0 items-center gap-1 self-start rounded-md px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-navy"
            >
              Filtrer <ArrowRight size={14} aria-hidden />
            </Link>
          </header>
          <div className="grid grid-cols-2 gap-px overflow-hidden bg-light-gray sm:grid-cols-3 lg:grid-cols-4">
            {repartitionCompagnies.map((c) => {
              const pct = kpis.total > 0 ? Math.round((c.total / kpis.total) * 100) : 0;
              return (
                <div
                  key={c.compagnie}
                  className="flex flex-col gap-2 bg-white p-4 transition hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-md bg-navy-50 text-navy ring-1 ring-navy/15">
                      <GraduationCap size={14} aria-hidden />
                    </span>
                    <span className="truncate text-xs font-semibold uppercase tracking-wide text-slate-600">
                      {c.compagnie}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-sans text-2xl font-semibold tabular-nums leading-none text-slate-900">
                      {c.total}
                    </p>
                    <span className="text-xs tabular-nums text-slate-500">{pct}%</span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-navy transition-[width] duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
