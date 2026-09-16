import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '../common/Button';
import PasswordInput from '../common/PasswordInput';
import { useLocale } from '../../context/LocaleContext';
import {
  confirmPasswordReset,
  requestPasswordReset,
  verifyPasswordResetOtp,
} from '../../services/authService';
import { formatApiError } from '../../utils/apiErrors';

export function isEspEmail(v) {
  const s = String(v).trim().toLowerCase();
  return /^[a-z0-9._%-]+@esp\.mr$/.test(s);
}

/**
 * Réinitialisation mot de passe via OTP e-mail (API).
 * @param {{ defaultEmail?: string, emailReadOnly?: boolean, onSuccess?: () => void, compact?: boolean, source?: 'login_recovery' | 'profile_reset' }} props
 */
export default function PasswordResetSection({
  defaultEmail = '',
  emailReadOnly = false,
  onSuccess,
  compact = false,
  source = 'login_recovery',
}) {
  const { t } = useTranslation('auth');
  const { lang } = useLocale();
  const steps = useMemo(
    () => [
      { id: 0, label: t('reset.stepEmail') },
      { id: 1, label: t('reset.stepOtp') },
      { id: 2, label: t('reset.stepNewPassword') },
    ],
    [t],
  );
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState(defaultEmail);
  const [otp, setOtp] = useState('');
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const sendOtp = async (e) => {
    e.preventDefault();
    setErr('');
    setSuccess('');
    if (!isEspEmail(email)) {
      setErr(t('reset.invalidEspEmail'));
      return;
    }
    const normalized = String(email).trim().toLowerCase();
    setEmail(normalized);
    setSubmitting(true);
    try {
      await requestPasswordReset(normalized, source, lang);
      setStep(1);
      setSuccess('');
    } catch (error) {
      setErr(error?.userMessage || formatApiError(error) || t('reset.sendFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setErr('');
    setSubmitting(true);
    try {
      const data = await verifyPasswordResetOtp({ email, otp });
      if (!data?.reset_token) {
        setErr(t('reset.invalidServerResponse'));
        return;
      }
      setResetToken(data.reset_token);
      setStep(2);
    } catch (error) {
      setErr(error?.userMessage || formatApiError(error) || t('reset.otpUnrecognized'));
    } finally {
      setSubmitting(false);
    }
  };

  const finish = async (e) => {
    e.preventDefault();
    setErr('');
    if (pwd.length < 8) {
      setErr(t('reset.passwordTooShort'));
      return;
    }
    if (pwd !== pwd2) {
      setErr(t('reset.passwordMismatch'));
      return;
    }
    if (!resetToken) {
      setErr(t('reset.sessionExpired'));
      setStep(0);
      return;
    }
    setSubmitting(true);
    try {
      await confirmPasswordReset({ reset_token: resetToken, new_password: pwd });
      setSuccess(t('reset.success'));
      setStep(0);
      setOtp('');
      setPwd('');
      setPwd2('');
      setResetToken('');
      onSuccess?.();
    } catch (error) {
      setErr(error?.userMessage || formatApiError(error) || t('reset.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const stepHandler = step === 0 ? sendOtp : step === 1 ? verifyOtp : finish;

  return (
    <div className={compact ? 'space-y-4' : 'space-y-5'}>
      {!compact ? (
        <div className="flex items-stretch justify-between gap-1 border-b border-light-gray pb-4">
          {steps.map((s, i) => {
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
            <label className="form-field-contained block min-w-0 w-full">
              <span className="label">{t('reset.institutionalEmail')}</span>
              <div className="relative min-w-0" dir="ltr">
                <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  className="input w-full min-w-0 pl-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmail((v) => String(v).trim().toLowerCase())}
                  placeholder={t('reset.emailPlaceholder')}
                  autoComplete="email"
                  inputMode="email"
                  maxLength={254}
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
              {submitting ? t('reset.sending') : t('reset.sendOtp')}
              {!submitting ? <ArrowRight size={18} /> : null}
            </Button>
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-sm text-text-light leading-snug">
              {t('reset.otpSent', { email })}
            </p>
            <p className="text-sm text-text-muted leading-snug">{t('reset.checkSpam')}</p>
            <label className="form-field-contained block min-w-0 w-full">
              <span className="label">{t('reset.otpLabel')}</span>
              <input
                className="input w-full min-w-0 text-center font-mono text-xl tracking-[0.3em]"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="······"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                autoComplete="one-time-code"
                autoFocus
              />
            </label>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button type="button" variant="secondary" onClick={() => setStep(0)} disabled={submitting}>
                <ArrowLeft size={18} /> {t('reset.back')}
              </Button>
              <Button type="submit" variant="primary" disabled={submitting || otp.length < 6} className="gap-2">
                {submitting ? t('reset.verifying') : t('reset.verifyOtp')}
                {!submitting ? <ArrowRight size={18} /> : null}
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <label className="form-field-contained block min-w-0 w-full">
              <span className="label">{t('reset.newPassword')}</span>
              <PasswordInput
                className="input w-full min-w-0"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                autoComplete="new-password"
                autoFocus
              />
            </label>
            <label className="form-field-contained block min-w-0 w-full">
              <span className="label">{t('reset.confirmPassword')}</span>
              <PasswordInput
                className="input w-full min-w-0"
                value={pwd2}
                onChange={(e) => setPwd2(e.target.value)}
                autoComplete="new-password"
              />
            </label>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button type="button" variant="secondary" onClick={() => setStep(1)} disabled={submitting}>
                <ArrowLeft size={18} /> {t('reset.back')}
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? t('reset.saving') : t('reset.save')}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
