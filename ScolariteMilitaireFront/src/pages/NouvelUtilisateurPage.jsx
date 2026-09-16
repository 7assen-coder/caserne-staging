import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';
import Button from '../components/common/Button';
import SelectField from '../components/common/SelectField';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/userService';
import { FONCTION_ROLE_OPTIONS } from '../utils/constants';
import { getPermissions, getCanonicalRole, getCreatableRoleOptions, ROLES } from '../utils/userRole';
import { sanitizeMrPhoneDigits, blockNonDigitKey, isValidMrPhone8 } from '../utils/mrPhone';
import { formatApiError } from '../utils/apiErrors';

const DEFAULT_FORM = {
  prenom: '',
  nom: '',
  email: '',
  telephone: '',
  grade: '',
  fonction: '',
  scope_compagnie: '',
  scope_section: '',
};

function emailOk(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v ?? '').trim());
}

function fonctionLabel(value) {
  return FONCTION_ROLE_OPTIONS.find((o) => o.value === value)?.label || value;
}

function needsSection(fonction) {
  return fonction === ROLES.SUPERVISEUR || fonction === ROLES.CHEF_SECTION;
}

function needsCompagnie(fonction) {
  return fonction === ROLES.COMMANDANT_COMPAGNIE || needsSection(fonction);
}

export default function NouvelUtilisateurPage() {
  const navigate = useNavigate();
  const { fonction } = useAuth();
  const currentRole = getCanonicalRole(fonction);
  const perms = getPermissions(currentRole);

  const roleOptions = useMemo(
    () => [{ value: '', label: '— Sélectionner un rôle —' }, ...getCreatableRoleOptions(currentRole)],
    [currentRole],
  );

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
    if (!phoneDigits) e.telephone = 'Téléphone requis.';
    else if (!isValidMrPhone8(phoneDigits)) {
      e.telephone = 'Téléphone : 8 chiffres commençant par 2, 3 ou 4.';
    }
    if (!form.fonction) e.fonction = 'Sélectionner un rôle.';
    if (needsSection(form.fonction) && !form.scope_section.trim()) {
      e.scope_section = 'Section requise pour ce rôle.';
    }
    if (needsCompagnie(form.fonction) && form.fonction === ROLES.COMMANDANT_COMPAGNIE && !form.scope_compagnie.trim()) {
      e.scope_compagnie = 'Compagnie requise pour ce rôle.';
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
    const phone = sanitizeMrPhoneDigits(form.telephone);
    try {
      await userService.createUser({
        prenom: form.prenom.trim(),
        nom: form.nom.trim(),
        email: form.email.trim(),
        telephone: phone,
        grade: form.grade.trim(),
        fonction: form.fonction,
        scope_compagnie: form.scope_compagnie.trim(),
        scope_section: form.scope_section.trim(),
      });
      setSuccess(
        `Utilisateur créé : ${form.prenom} ${form.nom} (${fonctionLabel(form.fonction)}). Mot de passe initial : ${phone}.`,
      );
      setForm(DEFAULT_FORM);
    } catch (err) {
      setTopErr(err?.message || formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (perms.canCreateUserRoles.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:gap-x-8">
        <div className="xl:col-span-12">
          <h1 className="page-title">Gestion des utilisateurs</h1>
          <p className="mt-2 text-sm text-text-light md:text-base">
            Votre rôle actuel ne permet pas de créer de nouveaux utilisateurs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:gap-8 xl:grid-cols-12 xl:gap-x-8">
      <div className="xl:col-span-12">
        <Link
          to="/audit"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-navy/80"
        >
          <ArrowLeft size={18} aria-hidden />
          Retour
        </Link>
        <div className="mb-4 border-b border-light-gray pb-4">
          <h1 className="page-title">Nouvel utilisateur</h1>
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
        <p className="mb-5 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2.5 text-sm text-sky-900">
          Mot de passe initial automatique : le numéro de téléphone. L&apos;utilisateur devra le
          changer lors de sa première connexion.
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
            label="Téléphone"
            required
            error={errors.telephone}
            value={form.telephone}
            onChange={(v) => update('telephone', sanitizeMrPhoneDigits(v))}
            inputMode="numeric"
            maxLength={8}
            onKeyDown={blockNonDigitKey}
            placeholder="31234567"
          />
          <Field label="Grade / Fonction" error={errors.grade} value={form.grade} onChange={(v) => update('grade', v)} />
          <SelectField
            label="Rôle"
            value={form.fonction}
            onChange={(v) => update('fonction', v)}
            options={roleOptions}
            required
            error={errors.fonction}
          />
          {(needsCompagnie(form.fonction) || form.fonction === ROLES.COMMANDANT_COMPAGNIE) && (
            <Field
              label="Compagnie (périmètre)"
              required={form.fonction === ROLES.COMMANDANT_COMPAGNIE}
              error={errors.scope_compagnie}
              value={form.scope_compagnie}
              onChange={(v) => update('scope_compagnie', v)}
              placeholder="ex. 1ère compagnie"
            />
          )}
          {needsSection(form.fonction) && (
            <Field
              label="Section (périmètre)"
              required
              error={errors.scope_section}
              value={form.scope_section}
              onChange={(v) => update('scope_section', v)}
              placeholder="ex. Section 1"
            />
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-light-gray pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/audit')}
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
    <label className="form-field-contained block">
      <span className="label">
        {label}
        {required && <span className="text-brand-red"> *</span>}
      </span>
      <input
        type={type}
        className={`input min-h-[44px] w-full max-w-full min-w-0 sm:min-h-[2.5rem] ${error ? 'ring-2 ring-brand-red/40' : ''}`}
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
