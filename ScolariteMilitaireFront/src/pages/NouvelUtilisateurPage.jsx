import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';
import Button from '../components/common/Button';
import SelectField from '../components/common/SelectField';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/userService';
import {
  ROLE_LABEL,
  getPermissions,
  getCreatableRoleOptions,
  getCanonicalRole,
} from '../utils/userRole';
import { sanitizeMrPhoneDigits, blockNonDigitKey, isValidMrPhone8 } from '../utils/mrPhone';
import { formatApiError } from '../utils/apiErrors';

const DEFAULT_FORM = {
  prenom: '',
  nom: '',
  email: '',
  telephone: '',
  matricule: '',
  grade: '',
  password: '',
  passwordConfirm: '',
  role: '',
};

function emailOk(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v ?? '').trim());
}

export default function NouvelUtilisateurPage() {
  const navigate = useNavigate();
  const { fonction } = useAuth();
  const currentRole = getCanonicalRole(fonction);
  const perms = getPermissions(currentRole);

  const creatableOptions = useMemo(() => {
    const opts = getCreatableRoleOptions(currentRole);
    return [{ value: '', label: '— Sélectionner un rôle —' }, ...opts];
  }, [currentRole]);

  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});
  const [topErr, setTopErr] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (key, v) => {
    setForm((prev) => ({ ...prev, [key]: v }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setSuccess('');
  };

  const validate = () => {
    const e = {};
    if (!form.prenom.trim()) e.prenom = 'Prénom requis.';
    if (!form.nom.trim()) e.nom = 'Nom requis.';
    if (!form.email.trim()) e.email = 'E-mail requis.';
    else if (!emailOk(form.email)) e.email = 'E-mail invalide.';
    const phoneDigits = sanitizeMrPhoneDigits(form.telephone);
    if (phoneDigits && !isValidMrPhone8(phoneDigits)) {
      e.telephone = 'Téléphone : 8 chiffres commençant par 2, 3 ou 4.';
    }
    if (!form.password) e.password = 'Mot de passe requis (min. 8 caractères).';
    else if (form.password.length < 8) e.password = 'Mot de passe : 8 caractères minimum.';
    if (form.passwordConfirm !== form.password) {
      e.passwordConfirm = 'La confirmation ne correspond pas.';
    }
    if (!form.role) e.role = 'Sélectionner un rôle.';
    else if (!perms.canCreateUserRoles.includes(form.role)) {
      e.role = `Vous n’êtes pas autorisé à créer ce rôle (${ROLE_LABEL[form.role] || form.role}).`;
    }
    return e;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setTopErr('');
    setSuccess('');
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      setTopErr(Object.values(e)[0]);
      return;
    }
    setSubmitting(true);
    try {
      await userService.createUser({
        prenom: form.prenom.trim(),
        nom: form.nom.trim(),
        email: form.email.trim(),
        telephone: sanitizeMrPhoneDigits(form.telephone),
        matricule: form.matricule.trim(),
        grade: form.grade.trim(),
        password: form.password,
        role: form.role,
      });
      setSuccess(`Utilisateur créé : ${form.prenom} ${form.nom} (${ROLE_LABEL[form.role]}).`);
      setForm(DEFAULT_FORM);
    } catch (err) {
      setTopErr(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (perms.canCreateUserRoles.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:gap-x-8">
        <nav className="text-base text-text-light xl:col-span-12">
          <Link to="/dashboard" className="hover:text-navy">
            Accueil
          </Link>
          <span className="mx-2">/</span>
          <span className="text-navy font-semibold">Utilisateurs</span>
        </nav>
        <div className="xl:col-span-12">
          <h1 className="page-title">Gestion des utilisateurs</h1>
          <p className="mt-2 text-sm text-text-light md:text-base">
            Votre rôle actuel ({ROLE_LABEL[currentRole]}) ne permet pas de créer de nouveaux utilisateurs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:gap-8 xl:grid-cols-12 xl:gap-x-8">
      <nav className="text-base text-text-light xl:col-span-12">
        <Link to="/dashboard" className="hover:text-navy">
          Accueil
        </Link>
        <span className="mx-2">/</span>
        <Link to="/eleves" className="hover:text-navy">
          Étudiants
        </Link>
        <span className="mx-2">/</span>
        <span className="text-navy font-semibold">Nouvel utilisateur</span>
      </nav>

      <div className="xl:col-span-12">
        <Link
          to="/eleves"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-navy/80"
        >
          <ArrowLeft size={18} aria-hidden />
          Retour à la liste
        </Link>
        <div className="mb-4 border-b border-light-gray pb-4">
          <h1 className="page-title">Nouvel utilisateur</h1>
          <p className="mt-1 text-sm text-text-light md:text-base">
            Création d’un compte avec rôle. Vous êtes connecté en tant que{' '}
            <strong className="text-navy">{ROLE_LABEL[currentRole]}</strong>.
          </p>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="xl:col-span-12 min-h-0 w-full max-w-full overflow-x-hidden rounded-2xl border border-light-gray bg-white px-3 pb-8 pt-4 shadow-[0_1px_3px_rgba(15,27,51,0.06)] sm:px-6 sm:pb-10 sm:pt-6 lg:px-8"
      >
        <h2 className="mb-1 font-serif text-lg font-semibold text-slate-900">
          <UserPlus size={18} className="-mt-0.5 mr-1 inline" aria-hidden />
          Informations du compte
        </h2>
        <p className="mb-5 text-xs text-text-light">
          Tous les champs marqués d’un astérisque (*) sont obligatoires.
        </p>

        {(topErr || success) && (
          <div
            className={`mb-4 rounded-xl border px-3 py-2.5 text-sm font-medium leading-snug sm:px-4 ${
              topErr
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            {topErr || success}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Prénom" required error={errors.prenom} value={form.prenom} onChange={(v) => update('prenom', v)} />
          <Field label="Nom" required error={errors.nom} value={form.nom} onChange={(v) => update('nom', v)} />
          <Field
            label="E-mail"
            required
            error={errors.email}
            value={form.email}
            onChange={(v) => update('email', v)}
            type="email"
            inputMode="email"
            autoComplete="email"
          />
          <Field
            label="Téléphone (Mauritanie)"
            error={errors.telephone}
            value={form.telephone}
            onChange={(v) => update('telephone', sanitizeMrPhoneDigits(v))}
            inputMode="numeric"
            maxLength={8}
            onKeyDown={blockNonDigitKey}
            placeholder="31234567"
          />
          <Field label="Matricule" error={errors.matricule} value={form.matricule} onChange={(v) => update('matricule', v)} />
          <Field label="Grade / Fonction" error={errors.grade} value={form.grade} onChange={(v) => update('grade', v)} />
          <SelectField
            label="Rôle"
            value={form.role}
            onChange={(v) => update('role', v)}
            options={creatableOptions}
            required
            error={errors.role}
          />
          <Field
            label="Mot de passe"
            required
            error={errors.password}
            value={form.password}
            onChange={(v) => update('password', v)}
            type="password"
            autoComplete="new-password"
          />
          <Field
            label="Confirmer le mot de passe"
            required
            error={errors.passwordConfirm}
            value={form.passwordConfirm}
            onChange={(v) => update('passwordConfirm', v)}
            type="password"
            autoComplete="new-password"
          />
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-light-gray pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/eleves')}
            className="w-full sm:w-auto"
          >
            Annuler
          </Button>
          <Button type="submit" variant="primary" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? 'Création…' : 'Créer l’utilisateur'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  error,
  inputMode,
  maxLength,
  onKeyDown,
  placeholder,
  autoComplete,
}) {
  return (
    <label className="block min-w-0">
      <span className="label">
        {label}
        {required && <span className="text-brand-red"> *</span>}
      </span>
      <input
        type={type}
        className={`input min-h-[44px] sm:min-h-[2.5rem] ${error ? 'ring-2 ring-brand-red/40' : ''}`}
        required={required}
        value={value ?? ''}
        inputMode={inputMode}
        maxLength={maxLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onKeyDown={onKeyDown}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? <p className="mt-1.5 text-sm font-medium leading-snug text-brand-red">{error}</p> : null}
    </label>
  );
}
