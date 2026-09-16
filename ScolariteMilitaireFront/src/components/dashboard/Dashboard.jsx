import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users,
  UserPlus,
  ChevronRight,
  Globe,
  AlertCircle,
  CircleDot,
  GraduationCap,
  Upload,
  FileDown,
  UserCog,
  ArrowRight,
} from 'lucide-react';
import QueryErrorPanel from '../common/QueryErrorPanel';
import { useDashboardStats } from '../../hooks/useElevesQueries';
import { useAuth } from '../../hooks/useAuth';
import { alertLabelForEleve } from '../../utils/dashboardStats';
import { getCanonicalRole, getPermissions } from '../../utils/userRole';

function QuickAction({ icon: Icon, title, subtitle, to, primary = false, disabled, unavailableLabel }) {
  if (disabled) {
    return (
      <div
        aria-disabled
        className="group relative flex min-w-0 flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-5 opacity-45"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-200/80 text-slate-400">
          <Icon size={22} aria-hidden strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="text-[0.95rem] font-semibold leading-snug text-slate-600">{title}</p>
          <p className="mt-1 text-xs text-slate-400">{unavailableLabel}</p>
        </div>
      </div>
    );
  }
  return (
    <Link
      to={to}
      className={`group relative flex min-w-0 flex-col gap-4 rounded-2xl border p-5 transition-all duration-200 ${primary
          ? 'border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 text-white shadow-[0_12px_40px_-24px_rgba(15,23,42,0.9)] hover:-translate-y-0.5 hover:shadow-[0_16px_48px_-20px_rgba(15,23,42,0.75)]'
          : 'border-slate-200/90 bg-white text-slate-800 shadow-[0_2px_8px_-4px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_32px_-16px_rgba(15,23,42,0.12)]'
        }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${primary
              ? 'bg-white/[0.12] text-amber-200/95 ring-1 ring-white/10'
              : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/70 group-hover:bg-slate-900 group-hover:text-amber-200 group-hover:ring-slate-800'
            }`}
        >
          <Icon size={22} aria-hidden strokeWidth={1.75} />
        </span>
        <ChevronRight
          size={18}
          strokeWidth={1.75}
          className={`shrink-0 transition group-hover:translate-x-0.5 rtl:rotate-180 ${primary ? 'text-white/50 group-hover:text-amber-200/90' : 'text-slate-300 group-hover:text-slate-600'
            }`}
          aria-hidden
        />
      </div>
      <div className="min-w-0">
        <p className={`truncate text-[0.95rem] font-semibold leading-snug ${primary ? 'text-white' : 'text-slate-900'}`}>
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
  const toneClass = tones[tone] || tones.slate;
  return (
    <div
      className={`relative flex min-h-[7.75rem] min-w-0 flex-col justify-between rounded-2xl bg-gradient-to-b p-4 sm:p-5 shadow-[0_2px_8px_-4px_rgba(15,23,42,0.06)] ring-1 ring-inset ${toneClass}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/85 text-current shadow-sm ring-1 ring-slate-200/60">
          <Icon size={20} strokeWidth={1.75} aria-hidden />
        </span>
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">{label}</p>
        <p className="mt-1 font-sans text-[1.875rem] font-semibold tabular-nums tracking-tight text-slate-900">
          {loading ? <span className="inline-block h-8 w-14 animate-pulse rounded-lg bg-slate-200/80" /> : value}
        </p>
        {hint ? <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{hint}</p> : null}
      </div>
    </div>
  );
}

function FiliereRow({ row, max, total, completeLabel, followUpLabel }) {
  const completePct = total > 0 ? (row.dossiersComplets / total) * 100 : 0;
  const widthPct = max > 0 ? Math.max(10, (total / max) * 100) : 0;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <span className="min-w-0 truncate text-sm font-semibold text-slate-900">{row.filiere}</span>
        <span className="shrink-0 tabular-nums text-xs text-slate-500">
          <span className="font-semibold text-slate-800">{total}</span>{' '}
          <span className="text-slate-400">·</span> {row.dossiersComplets}{' '}
          <span className="text-emerald-600">{completeLabel}</span> · {row.dossiersASurveiller}{' '}
          <span className="text-amber-600">{followUpLabel}</span>
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="absolute inset-y-0 start-0 flex h-full overflow-hidden rounded-full bg-slate-200/70"
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
  const { t, i18n } = useTranslation('dashboard');
  const { user, fonction } = useAuth();
  const role = getCanonicalRole(fonction);
  const perms = getPermissions(role);
  const locale = i18n.language === 'ar' ? 'ar-MR' : 'fr-FR';

  const { data: stats, isPending: loading, error, refetch, isError } = useDashboardStats();

  const kpis = useMemo(() => {
    if (!stats) {
      return { total: 0, dossiersASurveiller: 0, enMobilite: 0, completionPct: 0 };
    }
    return {
      total: stats.total_eleves ?? 0,
      dossiersASurveiller: stats.needs_attention ?? 0,
      enMobilite: stats.mobilite_count ?? 0,
      completionPct: stats.completion_pct ?? 0,
    };
  }, [stats]);

  const parFiliere = useMemo(() => stats?.par_filiere ?? [], [stats]);
  const maxFiliere = useMemo(
    () => parFiliere.reduce((m, r) => Math.max(m, (r.dossiersComplets ?? 0) + (r.dossiersASurveiller ?? 0)), 0),
    [parFiliere],
  );

  const aSurveiller = useMemo(() => {
    return (stats?.attention_sample ?? []).map((e) => ({
      id: e.id,
      matricule: e.matricule,
      prenom: e.prenom,
      nom: e.nom,
      contact: { telephone: e.tel1, emailPerso: e.emailPerso },
      tel1: e.tel1,
      emailPerso: e.emailPerso,
      scolarite: { departement: e.departement },
    }));
  }, [stats]);

  const repartitionCompagnies = useMemo(
    () => stats?.repartition_compagnies ?? [],
    [stats],
  );

  const today = new Date();
  const formattedDate = today.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const hour = today.getHours();
  const greeting =
    hour < 5
      ? t('greetingNight')
      : hour < 12
        ? t('greetingMorning')
        : hour < 18
          ? t('greetingAfternoon')
          : t('greetingEvening');
  const userPrenom = user?.prenom || user?.first_name || '';
  const userNom = user?.nom || user?.last_name || '';
  const displayName = [userPrenom, userNom].filter(Boolean).join(' ');

  return (
    <div className="min-w-0 space-y-8 md:space-y-10">
      <header className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <h1 className="min-w-0 font-serif text-2xl font-semibold tracking-tight text-navy sm:text-3xl md:text-4xl">
          {greeting}
          {displayName ? (
            <>
              <span className="text-slate-400">,</span>{' '}
              <span className="bg-gradient-to-r from-amber-800 to-gold bg-clip-text text-transparent">
                {displayName}
              </span>
            </>
          ) : null}
        </h1>
        <p className="shrink-0 text-sm font-medium capitalize tracking-wide text-slate-500 sm:text-end sm:text-base">
          {formattedDate}
        </p>
      </header>

      {isError ? (
        <QueryErrorPanel
          error={error}
          title={t('loadError')}
          onRetry={() => refetch()}
        />
      ) : null}

      {!isError ? (
      <>
      <section aria-label={t('quickAccessAria')} className="min-w-0">
        <div className="mb-4">
          <h2 className="font-sans text-lg font-semibold tracking-tight text-slate-900 md:text-xl">
            {t('quickAccess')}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <QuickAction
            icon={UserPlus}
            title={t('newStudent')}
            subtitle={t('newStudentHint')}
            to="/eleves/nouveau"
            primary
            disabled={!perms.canCreateStudent}
            unavailableLabel={t('unavailableRole')}
          />
          <QuickAction
            icon={Upload}
            title={t('import')}
            subtitle={t('importHint')}
            to="/eleves/import"
            unavailableLabel={t('unavailableRole')}
          />
          <QuickAction
            icon={FileDown}
            title={t('export')}
            subtitle={t('exportHint')}
            to="/eleves/dossiers"
            unavailableLabel={t('unavailableRole')}
          />
          <QuickAction
            icon={UserCog}
            title={t('newUser')}
            subtitle={t('newUserHint')}
            to="/utilisateurs/nouveau"
            disabled={perms.canCreateUserRoles.length === 0}
            unavailableLabel={t('unavailableRole')}
          />
        </div>
      </section>

      <section aria-label={t('overviewAria')} className="min-w-0">
        <div className="mb-4">
          <h2 className="font-sans text-lg font-semibold tracking-tight text-slate-900 md:text-xl">
            {t('overview')}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <Kpi
            icon={Users}
            label={t('kpiStudents')}
            value={kpis.total.toLocaleString(locale)}
            hint={loading ? null : t('kpiCompletePct', { pct: kpis.completionPct })}
            tone="blue"
            loading={loading}
          />
          <Kpi
            icon={Globe}
            label={t('kpiMobility')}
            value={kpis.enMobilite.toLocaleString(locale)}
            hint={t('kpiMobilityHint')}
            tone="amber"
            loading={loading}
          />
          <Kpi
            icon={AlertCircle}
            label={t('kpiIncomplete')}
            value={kpis.dossiersASurveiller.toLocaleString(locale)}
            hint={t('kpiIncompleteHint')}
            tone="rose"
            loading={loading}
          />
        </div>
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-6 md:gap-7 lg:grid-cols-12">
        <section className="min-w-0 lg:col-span-7 xl:col-span-8">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_24px_-20px_rgba(15,23,42,0.12)]">
            <header className="flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-4 py-4 sm:px-5 md:px-6">
              <div className="min-w-0">
                <h3 className="font-sans text-base font-semibold text-slate-900">{t('byFiliere')}</h3>
              </div>
              <Link
                to="/eleves/dossiers"
                className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              >
                {t('listLink')} <ChevronRight size={14} className="rtl:rotate-180" />
              </Link>
            </header>
            <div className="px-4 py-5 sm:px-5">
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
                <p className="py-8 text-center text-sm text-slate-500">{t('noStudents')}</p>
              ) : (
                <ul className="space-y-4">
                  {parFiliere.map((row) => {
                    const total = row.dossiersComplets + row.dossiersASurveiller;
                    return (
                      <li key={row.filiere} className="min-w-0">
                        <FiliereRow
                          row={row}
                          max={maxFiliere}
                          total={total}
                          completeLabel={t('completeLabel')}
                          followUpLabel={t('followUpLabel')}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </section>

        <aside className="min-w-0 space-y-6 md:space-y-7 lg:col-span-5 xl:col-span-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_24px_-20px_rgba(15,23,42,0.1)]">
            <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5 md:px-6">
              <div className="min-w-0">
                <h3 className="font-sans text-base font-semibold text-slate-900">{t('toComplete')}</h3>
              </div>
              <Link
                to="/eleves/dossiers"
                className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              >
                {t('listLink')} <ChevronRight size={14} className="rtl:rotate-180" />
              </Link>
            </header>
            <ul className="divide-y divide-slate-100">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-100" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                      <div className="h-2.5 w-1/3 animate-pulse rounded bg-slate-100" />
                    </div>
                  </li>
                ))
              ) : aSurveiller.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-slate-500 sm:px-5">
                  <span className="inline-flex items-center gap-1.5 text-emerald-700">
                    <CircleDot size={12} /> {t('noneToComplete')}
                  </span>
                </li>
              ) : (
                aSurveiller.map((e) => (
                  <li key={e.id} className="flex min-w-0 items-center gap-3 px-4 py-3 transition hover:bg-slate-50 sm:px-5">
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
        </aside>
      </div>

      {repartitionCompagnies.length > 0 ? (
        <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_4px_24px_-20px_rgba(15,23,42,0.1)] sm:p-4">
          <header className="mb-3 flex flex-col gap-2 px-1 sm:mb-4 sm:flex-row sm:items-center sm:justify-between sm:px-2">
            <h2 className="font-sans text-base font-semibold text-slate-900">{t('byCompany')}</h2>
            <Link
              to="/eleves/dossiers"
              className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
            >
              {t('listLink')} <ArrowRight size={14} aria-hidden className="rtl:rotate-180" />
            </Link>
          </header>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {repartitionCompagnies.map((c) => {
              const pct = kpis.total > 0 ? Math.round((c.total / kpis.total) * 100) : 0;
              return (
                <div
                  key={c.compagnie}
                  className="flex min-w-0 flex-col gap-2 rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 transition hover:bg-slate-50"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700 ring-1 ring-slate-200/80">
                      <GraduationCap size={14} aria-hidden strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-slate-600">
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
      </>
      ) : null}
    </div>
  );
}
