import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Clock,
  UserPlus,
  ChevronRight,
  CalendarDays,
  Globe,
  ShieldCheck,
  Building2,
  GraduationCap,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
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

function KpiBlock({ icon: Icon, label, value, hint, accent = 'navy', to }) {
  const palettes = {
    navy: {
      bar: 'bg-navy',
      iconBg: 'border-navy/15 bg-navy-50 text-navy',
      hoverBorder: 'hover:border-navy/25',
    },
    gold: {
      bar: 'bg-gold',
      iconBg: 'border-gold/30 bg-amber-50 text-gold-700',
      hoverBorder: 'hover:border-gold/40',
    },
    emerald: {
      bar: 'bg-emerald-500',
      iconBg: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      hoverBorder: 'hover:border-emerald-300',
    },
    sky: {
      bar: 'bg-sky-500',
      iconBg: 'border-sky-200 bg-sky-50 text-sky-700',
      hoverBorder: 'hover:border-sky-300',
    },
  };
  const p = palettes[accent] || palettes.navy;
  const Wrapper = to ? Link : 'div';
  const wrapperProps = to ? { to } : {};
  return (
    <Wrapper
      {...wrapperProps}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-light-gray bg-white p-4 shadow-sm transition duration-200 hover:shadow-card-hover sm:p-5 md:p-6 ${p.hoverBorder}`}
    >
      <div className={`absolute left-0 top-0 h-full w-1 rounded-l-2xl ${p.bar}`} aria-hidden />
      <div className="pl-3">
        <div className="flex items-start justify-between gap-3">
          <div
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border sm:h-12 sm:w-12 ${p.iconBg}`}
          >
            <Icon size={22} strokeWidth={1.75} />
          </div>
          {to ? (
            <ArrowUpRight
              size={18}
              className="text-text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-navy"
            />
          ) : null}
        </div>
        <p className="mt-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-text-light sm:text-[0.7rem]">
          {label}
        </p>
        <p className="mt-1 font-sans text-[1.65rem] font-semibold tabular-nums tracking-tight text-navy-900 sm:text-3xl md:text-[2.1rem]">
          {value}
        </p>
        {hint ? <p className="mt-1.5 text-xs leading-snug text-text-light sm:text-sm">{hint}</p> : null}
      </div>
    </Wrapper>
  );
}

function FiliereBar({ row, max }) {
  const total = row.dossiersComplets + row.dossiersASurveiller;
  const completePct = total > 0 ? (row.dossiersComplets / total) * 100 : 0;
  const widthRatio = max > 0 ? Math.max(8, (total / max) * 100) : 0;
  return (
    <div className="rounded-xl border border-light-gray bg-white p-3 transition hover:border-slate-300 sm:p-4">
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="truncate text-sm font-semibold text-slate-900 sm:text-base">
          {row.filiere}
        </span>
        <span className="text-xs text-text-light sm:text-sm">
          <strong className="text-slate-900">{total}</strong> étudiants
        </span>
      </div>
      <div
        className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100"
        style={{ '--w': `${widthRatio}%` }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/80"
          style={{ width: `${(completePct * widthRatio) / 100}%` }}
        />
        <div
          className="absolute inset-y-0 rounded-full bg-amber-400/80"
          style={{
            left: `${(completePct * widthRatio) / 100}%`,
            width: `${(((100 - completePct) * widthRatio) / 100)}%`,
          }}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
        <span className="inline-flex items-center gap-1.5 text-emerald-700">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          {row.dossiersComplets} complets
        </span>
        <span className="inline-flex items-center gap-1.5 text-amber-700">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
          {row.dossiersASurveiller} à compléter
        </span>
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
    const compagnies = new Set(
      list
        .map((e) => e.dossierMilitaire?.compagnie)
        .filter(Boolean),
    );
    return {
      total: list.length,
      dossiersASurveiller,
      enMobilite,
      compagnies: compagnies.size,
    };
  }, [list]);

  const parFiliere = useMemo(() => repartitionParFiliere(list), [list]);
  const maxFiliere = useMemo(
    () => parFiliere.reduce((m, r) => Math.max(m, r.dossiersComplets + r.dossiersASurveiller), 0),
    [parFiliere],
  );

  const aSurveiller = useMemo(() => list.filter(eleveNeedsAttention).slice(0, 5), [list]);
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
  const greeting = hour < 5 ? 'Bonne nuit' : hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  const userPrenom = user?.prenom || user?.first_name || 'Utilisateur ESP';
  const userNom = user?.nom || user?.last_name || '';
  const anneeUni = getCurrentAcademicYear();

  return (
    <div className="relative min-h-0">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute -left-24 -top-32 h-72 w-72 rounded-full bg-gold/15 blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-slate-200/35 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(15,23,42,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.05) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative space-y-6 md:space-y-8 lg:space-y-10">
        <header className="overflow-hidden rounded-3xl border border-light-gray bg-gradient-to-br from-white via-white to-slate-50 p-5 shadow-card sm:p-6 md:p-8 lg:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 max-w-3xl space-y-3 sm:space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-light-gray bg-white px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-text-light shadow-sm sm:text-2xs">
                  <CalendarDays size={12} className="text-gold-700" />
                  {formattedDate}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-navy/20 bg-navy-50 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-navy shadow-sm sm:text-2xs">
                  <ShieldCheck size={12} aria-hidden />
                  {ROLE_LABEL[role]}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-amber-800 shadow-sm sm:text-2xs">
                  <Sparkles size={12} aria-hidden />
                  {anneeUni}
                </span>
              </div>
              <h1 className="page-title !text-[1.65rem] !leading-[1.1] sm:!text-4xl md:!text-5xl lg:!text-6xl !text-slate-900">
                {greeting}, <span className="text-navy">{userPrenom}{userNom ? ` ${userNom}` : ''}</span>
              </h1>
              <p className="page-subtitle !mt-1 max-w-2xl !text-sm !leading-relaxed text-text-light sm:!text-base">
                Vue d’ensemble de la scolarité&nbsp;: effectifs, dossiers, mobilité et activité récente.
              </p>
            </div>
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:w-auto lg:flex-row lg:items-center">
              <Link
                to="/eleves"
                className="btn btn-secondary btn-lg w-full justify-center inline-flex items-center gap-2 sm:w-auto"
              >
                <Users size={18} aria-hidden />
                <span>Étudiants</span>
              </Link>
              {perms.canCreateMobilite ? (
                <Link
                  to="/eleves/mobilite"
                  className="btn btn-secondary btn-lg w-full justify-center inline-flex items-center gap-2 sm:w-auto"
                >
                  <Globe size={18} aria-hidden />
                  <span>Mobilité</span>
                </Link>
              ) : null}
              {perms.canCreateStudent ? (
                <Link
                  to="/eleves/nouveau"
                  className="btn btn-primary btn-lg w-full justify-center inline-flex items-center gap-2 sm:col-span-2 lg:col-auto lg:w-auto"
                >
                  <UserPlus size={18} aria-hidden />
                  <span>Nouvel étudiant</span>
                </Link>
              ) : null}
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            Impossible de charger les données du tableau de bord. Vérifiez la connexion à l’API et votre session.
          </div>
        ) : null}

        <section
          aria-label="Indicateurs"
          className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
        >
          <KpiBlock
            icon={Users}
            label="Étudiants"
            value={loading ? '…' : kpis.total.toLocaleString('fr-FR')}
            accent="navy"
            hint="Effectif total du SI."
            to="/eleves"
          />
          <KpiBlock
            icon={Globe}
            label="En mobilité (DD / SE)"
            value={loading ? '…' : kpis.enMobilite.toLocaleString('fr-FR')}
            accent="sky"
            hint="Étudiants en double diplôme ou échange."
            to={perms.canCreateMobilite ? '/eleves/mobilite' : null}
          />
          <KpiBlock
            icon={Clock}
            label="Dossiers à compléter"
            value={loading ? '…' : String(kpis.dossiersASurveiller)}
            accent="gold"
            hint="Coordonnées manquantes ou invalides."
          />
          <KpiBlock
            icon={Building2}
            label="Compagnies actives"
            value={loading ? '…' : String(kpis.compagnies)}
            accent="emerald"
            hint="Compagnies représentées dans la base."
          />
        </section>

        <div className="grid min-h-0 grid-cols-1 gap-5 md:gap-6 lg:grid-cols-12 lg:items-start">
          <div className="min-w-0 lg:col-span-7 xl:col-span-8">
            <Card
              className="overflow-hidden"
              bodyClassName="!p-4 sm:!p-5 md:!p-6"
              title="Répartition par filière"
              subtitle="Dossiers complets vs dossiers à compléter par département."
              accent="gold"
              actions={
                <Link
                  to="/eleves"
                  className="group inline-flex items-center gap-1 text-sm font-semibold text-navy hover:text-esp-red"
                >
                  <span className="hidden sm:inline">Voir la liste</span>
                  <span className="sm:hidden">Liste</span>
                  <ChevronRight size={16} className="transition group-hover:translate-x-0.5" />
                </Link>
              }
            >
              <div className="flex flex-col gap-3">
                {loading ? (
                  <p className="text-sm text-text-light">Chargement…</p>
                ) : parFiliere.length === 0 ? (
                  <p className="text-sm text-text-light">Aucun étudiant à afficher.</p>
                ) : (
                  parFiliere.map((row) => (
                    <FiliereBar key={row.filiere} row={row} max={maxFiliere} />
                  ))
                )}
              </div>
            </Card>
          </div>

          <div className="min-w-0 space-y-5 md:space-y-6 lg:col-span-5 xl:col-span-4">
            <Card
              bodyClassName="!p-4 md:!p-5"
              title="Dossiers à compléter"
              subtitle={`${kpis.dossiersASurveiller} étudiant${kpis.dossiersASurveiller > 1 ? 's' : ''} à suivre`}
              actions={
                <Link
                  to="/eleves"
                  className="group inline-flex items-center gap-1 text-sm font-semibold text-navy hover:text-esp-red"
                >
                  <span className="hidden sm:inline">Tout voir</span>
                  <span className="sm:hidden">Tout</span>
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
                        <p className="truncate text-2xs text-text-light">{e.matricule || '—'}</p>
                      </div>
                      <Badge tone="alerte" className="!text-2xs">
                        {alertLabelForEleve(e)}
                      </Badge>
                    </li>
                  ))
                )}
              </ul>
            </Card>

            <Card
              bodyClassName="!p-4 md:!p-5"
              title="Mobilité récente"
              subtitle="Étudiants actuellement en DD ou SE"
              accent="gold"
              actions={
                perms.canCreateMobilite ? (
                  <Link
                    to="/eleves/mobilite"
                    className="group inline-flex items-center gap-1 text-sm font-semibold text-navy hover:text-esp-red"
                  >
                    <span className="hidden sm:inline">Tout voir</span>
                    <span className="sm:hidden">Tout</span>
                    <ChevronRight size={16} className="transition group-hover:translate-x-0.5" />
                  </Link>
                ) : null
              }
            >
              <ul className="flex flex-col gap-2">
                {loading ? (
                  <li className="text-sm text-text-light">Chargement…</li>
                ) : mobilitesRecentes.length === 0 ? (
                  <li className="text-sm text-text-light">Aucune mobilité enregistrée.</li>
                ) : (
                  mobilitesRecentes.map((e) => {
                    const t = e.mobilite?.type || '';
                    const isDD = t === 'Double diplôme';
                    return (
                      <li
                        key={e.id}
                        className="flex items-center gap-3 rounded-xl border border-light-gray bg-white p-3 transition hover:border-slate-300 hover:bg-off-white"
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                          <Globe size={18} aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-slate-900">
                            {e.nom} {e.prenom}
                          </p>
                          <p className="truncate text-2xs text-text-light">
                            {e.mobilite?.etablissement || '—'}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
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
            </Card>
          </div>
        </div>

        {repartitionCompagnies.length > 0 ? (
          <section>
            <Card
              bodyClassName="!p-4 sm:!p-5 md:!p-6"
              title="Répartition par compagnie"
              subtitle="Effectifs des étudiants groupés par compagnie."
              accent="navy"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {repartitionCompagnies.map((c) => (
                  <div
                    key={c.compagnie}
                    className="flex items-center gap-3 rounded-xl border border-light-gray bg-white p-3 transition hover:border-navy/25 sm:p-4"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-navy/15 bg-navy-50 text-navy">
                      <GraduationCap size={18} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{c.compagnie}</p>
                      <p className="text-xs text-text-light">
                        <strong className="text-navy-900">{c.total}</strong> étudiant{c.total > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        ) : null}
      </div>
    </div>
  );
}
