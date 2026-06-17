import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import Button from '../components/common/Button';
import { useAuth } from '../hooks/useAuth';
import { INITIAL_USER_PASSWORD } from '../services/authService';

export default function SetPasswordPage() {
  const { isAuthenticated, bootstrapped, mustChangePassword, user, completePasswordChange } = useAuth();
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!bootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-50/40 font-medium text-navy">
        Chargement…
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (!mustChangePassword) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (pwd.length < 6) {
      setErr('Mot de passe trop court (min. 6 caractères).');
      return;
    }
    if (pwd === INITIAL_USER_PASSWORD) {
      setErr('Choisissez un mot de passe différent du mot de passe initial.');
      return;
    }
    if (pwd !== pwd2) {
      setErr('Les mots de passe ne correspondent pas.');
      return;
    }
    setSubmitting(true);
    try {
      await completePasswordChange(pwd);
    } catch (error) {
      setErr(error?.message || 'Impossible de mettre à jour le mot de passe.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-navy-50/40 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-light-gray bg-white p-6 shadow-card sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-navy/10 text-navy">
            <Lock size={22} aria-hidden />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-navy">Nouveau mot de passe</h1>
            <p className="text-sm text-text-light">
              Première connexion — {user?.prenom} {user?.nom}
            </p>
          </div>
        </div>

        <p className="mb-5 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          Vous devez définir un mot de passe personnel avant d&apos;accéder à l&apos;application.
        </p>

        {err ? (
          <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-brand-red" role="alert">
            {err}
          </p>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="form-field-contained block">
            <span className="label">Nouveau mot de passe</span>
            <input
              type="password"
              className="input"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              autoComplete="new-password"
              autoFocus
              disabled={submitting}
            />
          </label>
          <label className="form-field-contained block">
            <span className="label">Confirmer le mot de passe</span>
            <input
              type="password"
              className="input"
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              autoComplete="new-password"
              disabled={submitting}
            />
          </label>
          <Button type="submit" variant="primary" size="lg" className="w-full justify-center" disabled={submitting}>
            {submitting ? 'Enregistrement…' : 'Continuer vers l’application'}
          </Button>
        </form>
      </div>
    </div>
  );
}
