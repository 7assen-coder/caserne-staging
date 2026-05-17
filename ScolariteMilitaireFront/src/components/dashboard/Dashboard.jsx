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

function QuickAction({ icon: Icon, title, subtitle, to, primary = false, disabled }) {
  if (disabled) {
    return (
      <div
        aria-disabled
        className="group relative flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-5 opacity-45"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-200/80 text-slate-400">
          <Icon size={22} aria-hidden strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="text-[0.95rem] font-semibold leading-snug text-slate-600">{title}</p>
          <p className="mt-1 text-xs text-slate-400">Indisponible pour ce rôle.</p>
        </div>
      </div>
    );
  }
  return (
    <Link
      to={to}
      className={`group relative flex flex-col gap-4 rounded-2xl border p-5 transition-all duration-200 ${primary
          ? 'border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 text-white shadow-[0_12px_40px_-24px_rgba(15,23,42,0.9)] hover:-translate-y-0.5 hover:shadow-[0_16px_48px_-20px_rgba(15,23,42,0.75)]'
          : 'border-slate-200/90 bg-white text-slate-800 shadow-[0_2px_8px_-4px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_32px_-16px_rgba(15,23,42,0.12)]'
        }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${primary
              ? 'bg-white/[0.12] text-amber-200/95 ring-1 ring-white/10'
              : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/70 group-hover:bg-slate-900 group-hover:text-amber-200 group-hover:ring-slate-800'
            }`}
        >
          <Icon size={22} aria-hidden strokeWidth={1.75} />
        </span>
        <ChevronRight
          size={18}
          strokeWidth={1.75}
          className={`shrink-0 transition group-hover:translate-x-0.5 ${primary ? 'text-white/50 group-hover:text-amber-200/90' : 'text-slate-300 group-hover:text-slate-600'
            }`}
          aria-hidden
        />
      </div>
      <div className="min-w-0">
        <p className={`text-[0.95rem] font-semibold leading-snug ${primary ? 'text-white' : 'text-slate-900'}`}>
          {title}
        </p>
        <p className={`mt-1 line-clamp-2 text-xs leading-relaxed ${primary ? 'text-slate-300' : 'text-slate-500'}`}>
          {subtitle}
        </p>
      </div>
    </Link>
  );
}

function Kpi({ icon: Icon, label, value, hint, tone = 'slate', loading }) {
  const tones = {
    slate: 'from-slate-50 to-white text-slate-700 ring-slate-200/70',
    blue: 'from-sky-50/80 to-white text-sky-800 ring-sky-200/50',
    amber: 'from-amber-50/70 to-white text-amber-900 ring-amber-200/40',
    rose: 'from-rose-50/70 to-white text-rose-900 ring-rose-200/40',
    emerald: 'from-emerald-50/70 to-white text-emerald-900 ring-emerald-200/40',
  };
  const t = tones[tone] || tones.slate;
  return (
    <div
      className={`relative flex min-h-[7.75rem] flex-col justify-between rounded-2xl bg-gradient-to-b p-5 shadow-[0_2px_8px_-4px_rgba(15,23,42,0.06)] ring-1 ring-inset ${t}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/85 text-current shadow-sm ring-1 ring-slate-200/60">
          <Icon size={20} strokeWidth={1.75} aria-hidden />
        </span>
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">{label}</p>
        <p className="mt-1 font-sans text-[1.875rem] font-semibold tabular-nums tracking-tight text-slate-900">
          {loading ? <span className="inline-block h-8 w-14 animate-pulse rounded-lg bg-slate-200/80" /> : value}
        </p>
        {hint ? <p className="mt-1 text-xs leading-relaxed text-slate-500">{hint}</p> : null}
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
          <span className="font-semibold text-slate-800">{total}</span>{' '}
          <span className="text-slate-400">·</span> {row.dossiersComplets}{' '}
          <span className="text-emerald-600">complets</span> · {row.dossiersASurveiller}{' '}
          <span className="text-amber-600">suite</span>
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="absolute inset-y-0 left-0 flex h-full overflow-hidden rounded-full bg-slate-200/70"
          style={{ width: `${widthPct}%` }}
        >
          <div className="h-full bg-emerald-500/85" style={{ width: `${completePct}%` }} />
          <div className="h-full bg-amber-400/85" style={{ width: `${100 - completePct}%` }} />
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
    <div className="space-y-8 md:space-y-10">
      <header className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/70 bg-gradient-to-br from-white via-slate-50/80 to-slate-100/40 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/[0.03]">
        <div
          className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-gradient-to-br from-indigo-400/10 via-sky-400/5 to-transparent blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-32 bottom-0 h-64 w-64 rounded-full bg-gradient-to-tr from-amber-200/15 to-transparent blur-3xl"
          aria-hidden
        />
        <div className="relative px-5 py-7 sm:px-8 sm:py-8 md:px-10 md:py-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
            <Link
              to="/dashboard"
              className="flex min-w-0 max-w-md items-center gap-3.5 rounded-xl outline-none transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-slate-400/50"
            >
              <EspLogo className="h-10 w-10 shrink-0 rounded-full ring-2 ring-white shadow-sm" />
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-slate-900">Gestion ESP</p>
              </div>
            </Link>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200/80 backdrop-blur-sm">
                <CalendarDays size={14} className="text-slate-400" aria-hidden />
                <span className="capitalize">{formattedDate}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-amber-100 shadow-sm">
                <ShieldCheck size={14} aria-hidden className="opacity-90" />
                {ROLE_LABEL[role]}
              </span>
              <span className="inline-flex w-full items-center justify-center rounded-full bg-slate-200/50 px-3 py-1.5 text-xs font-medium text-slate-700 backdrop-blur-sm sm:w-auto">
                {anneeUni}
              </span>
            </div>
          </div>

          <h1 className="mt-7 max-w-3xl font-sans text-[1.65rem] font-semibold leading-[1.15] tracking-tight text-slate-900 sm:text-[2.125rem] md:text-[2.5rem]">
            {greeting},{' '}
            <span className="bg-gradient-to-r from-amber-700 to-amber-500 bg-clip-text font-semibold text-transparent">
              {userPrenom}
              {userNom ? ` ${userNom}` : ''}
            </span>
          </h1>
        </div>
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
        <div className="mb-4">
          <h2 className="font-sans text-lg font-semibold tracking-tight text-slate-900 md:text-xl">
            Accès rapides
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <QuickAction
            icon={UserPlus}
            title="Nouvel étudiant"
            subtitle="Créer un dossier complet"
            to="/eleves/nouveau"
            primary
            disabled={!perms.canCreateStudent}
          />
          <QuickAction
            icon={Globe}
            title="Mobilité (DD / SE)"
            subtitle="Étudiants en double diplôme ou échange"
            to="/eleves/mobilite"
            disabled={!perms.canCreateMobilite}
          />
          <QuickAction
            icon={Upload}
            title="Importer"
            subtitle="Liste d’étudiants en masse"
            to="/eleves/import"
          />
          <QuickAction
            icon={FileDown}
            title="Exporter"
            subtitle="Excel, PDF, Word"
            to="/eleves/export"
          />
          <QuickAction
            icon={UserCog}
            title="Nouvel utilisateur"
            subtitle="Compte avec rôle (admin, encadrant…)"
            to="/utilisateurs/nouveau"
            disabled={perms.canCreateUserRoles.length === 0}
          />
        </div>
      </section>

      <section aria-label="Indicateurs">
        <div className="mb-4">
          <h2 className="font-sans text-lg font-semibold tracking-tight text-slate-900 md:text-xl">
            Vue d’ensemble
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Kpi
            icon={Users}
            label="Étudiants"
            value={kpis.total.toLocaleString('fr-FR')}
            hint={loading ? null : `${kpis.completionPct}% dossiers complets`}
            tone="blue"
            loading={loading}
          />
          <Kpi
            icon={Globe}
            label="En mobilité"
            value={kpis.enMobilite.toLocaleString('fr-FR')}
            hint="Double diplôme + Échange"
            tone="amber"
            loading={loading}
          />
          <Kpi
            icon={AlertCircle}
            label="À compléter"
            value={kpis.dossiersASurveiller.toLocaleString('fr-FR')}
            hint="Coordonnées manquantes"
            tone="rose"
            loading={loading}
          />
          <Kpi
            icon={Building2}
            label="Compagnies"
            value={kpis.compagnies.toLocaleString('fr-FR')}
            hint="Compagnies actives"
            tone="emerald"
            loading={loading}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 md:gap-7 lg:grid-cols-12">
        <section className="lg:col-span-7 xl:col-span-8">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_24px_-20px_rgba(15,23,42,0.12)]">
            <header className="flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4 md:px-6">
              <div className="min-w-0">
                <h3 className="font-sans text-base font-semibold text-slate-900">Répartition par filière</h3>
              </div>
              <Link
                to="/eleves"
                className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Liste <ChevronRight size={14} />
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

        <aside className="space-y-6 md:space-y-7 lg:col-span-5 xl:col-span-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_24px_-20px_rgba(15,23,42,0.1)]">
            <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 md:px-6">
              <div>
                <h3 className="font-sans text-base font-semibold text-slate-900">Dossiers à compléter</h3>
              </div>
              <Link
                to="/eleves"
                className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Liste <ChevronRight size={14} />
              </Link>
            </header>
            <ul className="divide-y divide-slate-100">
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
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white ring-1 ring-slate-900/10">
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

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_24px_-20px_rgba(15,23,42,0.1)]">
            <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 md:px-6">
              <div>
                <h3 className="font-sans text-base font-semibold text-slate-900">Mobilité récente</h3>
              </div>
              {perms.canCreateMobilite ? (
                <Link
                  to="/eleves/mobilite"
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  Liste <ChevronRight size={14} />
                </Link>
              ) : null}
            </header>
            <ul className="divide-y divide-slate-100">
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
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ring-1 ${isDD
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
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums ring-1 ${isDD
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
        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_24px_-20px_rgba(15,23,42,0.1)]">
          <header className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
            <h2 className="font-sans text-base font-semibold text-slate-900">Répartition par compagnie</h2>
            <Link
              to="/eleves"
              className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Liste <ArrowRight size={14} aria-hidden />
            </Link>
          </header>
          <div className="grid grid-cols-2 gap-px overflow-hidden bg-slate-200/60 sm:grid-cols-3 lg:grid-cols-4">
            {repartitionCompagnies.map((c) => {
              const pct = kpis.total > 0 ? Math.round((c.total / kpis.total) * 100) : 0;
              return (
                <div
                  key={c.compagnie}
                  className="flex flex-col gap-2 bg-white p-4 transition hover:bg-slate-50/90"
                >
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-700 ring-1 ring-slate-200/80">
                      <GraduationCap size={14} aria-hidden strokeWidth={1.75} />
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
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-slate-700 to-slate-900 transition-[width] duration-500"
                      style={{ width: `${pct}%` }}
                    />
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
