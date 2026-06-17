import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  Hash,
  Mail,
  Phone,
  Shield,
  User,
} from 'lucide-react';
import PasswordResetSection from '../components/profile/PasswordResetSection';
import { useAuth } from '../hooks/useAuth';
import { initials } from '../utils/formatters';
import { FONCTION_LABEL } from '../utils/constants';
import { ROLE_LABEL, getCanonicalRole } from '../utils/userRole';

function displayValue(value) {
  const v = value == null ? '' : String(value).trim();
  return v || null;
}

function ProfileField({ label, value, icon: Icon, wide = false }) {
  const text = displayValue(value);
  return (
    <div
      className={`min-w-0 rounded-xl border border-light-gray/80 bg-off-white/60 px-4 py-3.5 ${wide ? 'sm:col-span-2' : ''}`}
    >
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {Icon ? <Icon size={13} className="shrink-0 text-esp-green" aria-hidden /> : null}
        {label}
      </p>
      <p
        className={`mt-1.5 break-words text-sm font-medium leading-snug ${
          text ? 'text-slate-900' : 'text-slate-400 italic'
        }`}
      >
        {text || 'Non renseigné'}
      </p>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const role = getCanonicalRole(user?.fonction);
  const roleLabel = ROLE_LABEL[role] || FONCTION_LABEL[user?.fonction] || user?.fonction || '—';

  const fullName = [user?.prenom, user?.nom].filter(Boolean).join(' ').trim();
  const headline = fullName || user?.email?.split('@')[0] || 'Compte ESP';

  return (
    <div className="grid min-w-0 max-w-full grid-cols-1 gap-6 md:gap-8 xl:grid-cols-12">
      <nav className="xl:col-span-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-light-gray bg-white px-3 py-1.5 text-sm text-text-light shadow-sm">
          <Link to="/dashboard" className="font-medium transition hover:text-navy">
            Accueil
          </Link>
          <span aria-hidden>/</span>
          <span className="font-semibold text-navy">Profil</span>
        </div>
      </nav>

      {/* Identity hero */}
      <section className="xl:col-span-12 overflow-hidden rounded-2xl border border-light-gray bg-white shadow-sm">
        <div className="h-1.5 bg-navy-gradient" />
        <div className="flex flex-col gap-5 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-7">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-navy-gradient text-xl font-bold text-white ring-2 ring-gold/35 shadow-md">
              {initials(user?.nom, user?.prenom) || headline.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold text-slate-900 sm:text-2xl">{headline}</h1>
              {fullName && user?.email ? (
                <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-slate-500">
                  <Mail size={14} className="shrink-0" aria-hidden />
                  {user.email}
                </p>
              ) : null}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-esp-green/25 bg-esp-green/10 px-2.5 py-0.5 text-xs font-semibold text-esp-green">
                  <Shield size={12} aria-hidden />
                  {roleLabel}
                </span>
                {displayValue(user?.matricule) ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    <Hash size={12} aria-hidden />
                    {user.matricule}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/80 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
            <BadgeCheck size={16} className="shrink-0 text-emerald-600" aria-hidden />
            Session active
          </div>
        </div>
      </section>

      {/* Personal info */}
      <section className="xl:col-span-7 flex flex-col overflow-hidden rounded-2xl border border-light-gray bg-white shadow-sm">
        <header className="border-b border-light-gray px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-slate-900">Informations personnelles</h2>
          <p className="mt-0.5 text-sm text-text-light">Données du compte connecté</p>
        </header>
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 sm:p-6">
          <ProfileField label="Prénom" value={user?.prenom} icon={User} />
          <ProfileField label="Nom" value={user?.nom} icon={User} />
          <ProfileField label="E-mail" value={user?.email} icon={Mail} wide />
          <ProfileField label="Téléphone" value={user?.phone} icon={Phone} />
          <ProfileField label="Matricule" value={user?.matricule} icon={Hash} />
          <ProfileField label="Grade" value={user?.grade} icon={BadgeCheck} />
          <ProfileField label="Fonction / rôle" value={roleLabel} icon={Shield} wide />
        </div>
      </section>

      {/* Security */}
      <section className="xl:col-span-5 flex flex-col overflow-hidden rounded-2xl border border-light-gray bg-white shadow-sm">
        <header className="border-b border-light-gray px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold/15 text-gold">
              <Shield size={18} aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Sécurité</h2>
              <p className="mt-0.5 text-sm leading-snug text-text-light">
                Réinitialisation du mot de passe
              </p>
              <p className="mt-1 text-xs text-slate-400">Interface front — sans API pour l&apos;instant</p>
            </div>
          </div>
        </header>
        <div className="min-w-0 flex-1 p-5 sm:p-6">
          <PasswordResetSection defaultEmail={user?.email || ''} emailReadOnly={!!user?.email} />
        </div>
      </section>
    </div>
  );
}
