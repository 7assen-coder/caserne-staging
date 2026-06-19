import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Lock, Mail } from 'lucide-react';
import Button from '../common/Button';

const STEPS = [
  { id: 0, label: 'E-mail' },
  { id: 1, label: 'Code OTP' },
  { id: 2, label: 'Nouveau MDP' },
];

/** Code démo — remplacer par flux API en production. */
export const DEMO_OTP = '123456';

export function isEspEmail(v) {
  const s = String(v).trim().toLowerCase();
  return /^[^\s@]+@esp\.mr$/i.test(s);
}

/**
 * Réinitialisation mot de passe — UI front uniquement (OTP démo).
 * @param {{ defaultEmail?: string, emailReadOnly?: boolean, onSuccess?: () => void, compact?: boolean }} props
 */
export default function PasswordResetSection({
  defaultEmail = '',
  emailReadOnly = false,
  onSuccess,
  compact = false,
}) {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState(defaultEmail);
  const [otp, setOtp] = useState('');
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const sendOtp = async (e) => {
    e.preventDefault();
    setErr('');
    setSuccess('');
    if (!isEspEmail(email)) {
      setErr('Saisissez une adresse se terminant par @esp.mr');
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    setStep(1);
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setErr('');
    if (otp.replace(/\s/g, '') !== DEMO_OTP) {
      setErr('Code non reconnu.');
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));
    setSubmitting(false);
    setStep(2);
  };

  const finish = async (e) => {
    e.preventDefault();
    setErr('');
    if (pwd.length < 6) {
      setErr('Mot de passe trop court (min. 6 caractères).');
      return;
    }
    if (pwd !== pwd2) {
      setErr('Les mots de passe ne correspondent pas.');
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 700));
    setSubmitting(false);
    setSuccess('Mot de passe mis à jour (simulation front).');
    setStep(0);
    setOtp('');
    setPwd('');
    setPwd2('');
    onSuccess?.();
  };

  const stepHandler = step === 0 ? sendOtp : step === 1 ? verifyOtp : finish;

  return (
    <div className={compact ? 'space-y-4' : 'space-y-5'}>
      {!compact ? (
        <div className="flex items-stretch justify-between gap-1 border-b border-light-gray pb-4">
          {STEPS.map((s, i) => {
            const done = i < step;
            const act = i === step;
            return (
              <div key={s.id} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold transition ${
                    act
                      ? 'bg-navy text-white border-navy'
                      : done
                        ? 'bg-esp-green text-white border-esp-green'
                        : 'bg-white text-text-light border-light-gray'
                  }`}
                >
                  {done ? <Check size={16} /> : i + 1}
                </span>
                <span
                  className={`text-center text-[10px] sm:text-xs leading-tight ${
                    act ? 'font-semibold text-navy' : 'text-text-light'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      {err ? (
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-brand-red">
          {err}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          {success}
        </p>
      ) : null}

      <form className="space-y-4" onSubmit={stepHandler}>
        {step === 0 && (
          <>
            <label className="form-field-contained block">
              <span className="label">E-mail institutionnel</span>
              <div className="relative">
                <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  className="input pl-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="prenom.nom@esp.mr"
                  autoComplete="email"
                  readOnly={emailReadOnly}
                  disabled={emailReadOnly}
                  autoFocus={!emailReadOnly}
                />
              </div>
            </label>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={submitting || !isEspEmail(email)}
              className="w-full justify-center gap-2"
            >
              {submitting ? 'Envoi…' : 'Recevoir un code OTP'}
              {!submitting ? <ArrowRight size={18} /> : null}
            </Button>
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-sm text-text-light leading-snug">
              Code envoyé à <span className="font-medium text-navy">{email}</span> (simulation).
            </p>
            <label className="form-field-contained block">
              <span className="label">Code OTP</span>
              <input
                className="input text-center font-mono text-xl tracking-[0.3em]"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="······"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
              />
            </label>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button type="button" variant="secondary" onClick={() => setStep(0)} disabled={submitting}>
                <ArrowLeft size={18} /> Précédent
              </Button>
              <Button type="submit" variant="primary" disabled={submitting || otp.length < 6} className="gap-2">
                {submitting ? 'Vérification…' : 'Vérifier le code'}
                {!submitting ? <ArrowRight size={18} /> : null}
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <label className="form-field-contained block">
              <span className="label">Nouveau mot de passe</span>
              <div className="relative">
                <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="password"
                  className="input pl-11"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  autoComplete="new-password"
                  autoFocus
                />
              </div>
            </label>
            <label className="form-field-contained block">
              <span className="label">Confirmer le mot de passe</span>
              <div className="relative">
                <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="password"
                  className="input pl-11"
                  value={pwd2}
                  onChange={(e) => setPwd2(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </label>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button type="button" variant="secondary" onClick={() => setStep(1)} disabled={submitting}>
                <ArrowLeft size={18} /> Précédent
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
