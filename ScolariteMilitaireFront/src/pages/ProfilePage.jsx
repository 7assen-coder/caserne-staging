import {
  BadgeCheck,
  Mail,
  Phone,
  Shield,
  User,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PasswordResetSection from '../components/profile/PasswordResetSection';
import { useAuth } from '../hooks/useAuth';
import { initials } from '../utils/formatters';
import { FONCTION_LABEL } from '../utils/constants';
import { ROLE_LABEL, ROLES, getCanonicalRole } from '../utils/userRole';

function displayValue(value) {
  const v = value == null ? '' : String(value).trim();
  return v || null;
}

function InfoRow({ label, value, icon: Icon, emptyLabel }) {
  const text = displayValue(value);
  return (
    <div className="grid min-w-0 flex-1 grid-cols-1 gap-1.5 border-b border-slate-100 py-4 last:border-b-0 sm:grid-cols-[10.5rem_minmax(0,1fr)] sm:items-center sm:gap-5">
      <dt className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-500">
        {Icon ? <Icon size={16} className="shrink-0 text-esp-green" aria-hidden /> : null}
        <span className="min-w-0 break-words">{label}</span>
      </dt>
      <dd
        className={`min-w-0 break-words text-base font-medium leading-relaxed ${
          text ? 'text-slate-900' : 'italic text-slate-400'
        }`}
      >
        {text || emptyLabel}
      </dd>
    </div>
  );
}

export default function ProfilePage() {
  const { t } = useTranslation(['profile']);
  const { user, fonction } = useAuth();
  const role = getCanonicalRole(fonction || user?.fonction);
  const roleLabel =
    role && role !== ROLES.ETUDIANT
      ? ROLE_LABEL[role] || FONCTION_LABEL[user?.fonction] || user?.fonction
      : null;

  const fullName = [user?.prenom, user?.nom].filter(Boolean).join(' ').trim();
  const headline = fullName || user?.email?.split('@')[0] || t('profile:accountFallback');

  return (
    <div className="grid min-w-0 max-w-full grid-cols-1 gap-6 overflow-x-hidden md:gap-8 xl:grid-cols-12 xl:gap-x-8">
      <div className="page-header min-w-0 xl:col-span-12">
        <div className="min-w-0 flex-1">
          <h1 className="page-title text-2xl sm:text-3xl md:text-5xl">{t('profile:pageTitle')}</h1>
          <p className="mt-1 text-sm text-text-light md:text-base">{t('profile:pageSubtitle')}</p>
        </div>
      </div>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-light-gray bg-white shadow-sm xl:col-span-12">
        <div className="h-1.5 bg-navy-gradient" />
        <div className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:px-7 sm:py-6">
          <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-navy-gradient text-lg font-bold text-white shadow-md ring-2 ring-gold/35 sm:h-16 sm:w-16 sm:text-xl">
              {initials(user?.nom, user?.prenom) || headline.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="break-words font-serif text-xl font-semibold text-slate-900 sm:truncate sm:text-2xl">
                {headline}
              </h2>
              {user?.email ? (
                <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-slate-500">
                  <Mail size={14} className="shrink-0" aria-hidden />
                  <span className="min-w-0 break-all sm:truncate">{user.email}</span>
                </p>
              ) : null}
              {roleLabel ? (
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-esp-green/25 bg-esp-green/10 px-2.5 py-0.5 text-xs font-semibold text-esp-green">
                    <Shield size={12} className="shrink-0" aria-hidden />
                    <span className="min-w-0 break-words">{roleLabel}</span>
                  </span>
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex w-full shrink-0 items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/80 px-3.5 py-2.5 text-xs font-medium text-emerald-800 sm:w-auto">
            <BadgeCheck size={16} className="shrink-0 text-emerald-600" aria-hidden />
            {t('profile:sessionActive')}
          </div>
        </div>
      </section>

      <section className="flex min-h-0 min-w-0 flex-col self-stretch overflow-hidden rounded-2xl border border-light-gray bg-white shadow-sm xl:col-span-7">
        <header className="shrink-0 border-b border-light-gray px-4 py-4 sm:px-6">
          <h2 className="break-words text-base font-semibold text-navy sm:text-lg">
            {t('profile:personalInfo')}
          </h2>
          <p className="mt-1 break-words text-sm text-slate-500">{t('profile:personalInfoHint')}</p>
        </header>
        <dl className="flex min-h-0 flex-1 flex-col justify-evenly px-4 py-1 sm:px-6">
          <InfoRow label={t('profile:prenom')} value={user?.prenom} icon={User} emptyLabel={t('profile:empty')} />
          <InfoRow label={t('profile:nom')} value={user?.nom} icon={User} emptyLabel={t('profile:empty')} />
          <InfoRow label={t('profile:email')} value={user?.email} icon={Mail} emptyLabel={t('profile:empty')} />
          <InfoRow label={t('profile:telephone')} value={user?.phone} icon={Phone} emptyLabel={t('profile:empty')} />
          <InfoRow label={t('profile:grade')} value={roleLabel} icon={BadgeCheck} emptyLabel={t('profile:empty')} />
        </dl>
      </section>

      <section className="flex min-h-0 min-w-0 flex-col self-stretch overflow-hidden rounded-2xl border border-light-gray bg-white shadow-sm xl:col-span-5">
        <header className="shrink-0 border-b border-light-gray px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy/5 text-navy ring-1 ring-navy/10">
              <Shield size={18} aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="break-words text-base font-semibold text-navy sm:text-lg">
                {t('profile:security')}
              </h2>
              <p className="mt-1 break-words text-sm leading-snug text-slate-500">
                {t('profile:securityHint')}
              </p>
            </div>
          </div>
        </header>
        <div className="min-w-0 flex-1 p-4 sm:p-6">
          <PasswordResetSection
            source="profile_reset"
            defaultEmail={user?.email || ''}
            emailReadOnly={!!user?.email}
          />
        </div>
      </section>
    </div>
  );
}
