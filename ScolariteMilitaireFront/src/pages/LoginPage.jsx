import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import EspLoginBackdrop from '../components/login/EspLoginBackdrop';
import LoginLangSwitch from '../components/login/LoginLangSwitch';
import EspLogo from '../components/common/EspLogo';
import PasswordInput from '../components/common/PasswordInput';
import Button from '../components/common/Button';
import { useAuth } from '../hooks/useAuth';
import { useLocale } from '../context/LocaleContext';
import { formatApiError } from '../utils/apiErrors';
import { isEspEmail } from '../components/profile/PasswordResetSection';
import { homePathForRole } from '../utils/homePath';
import { sanitizeMrPhoneDigits } from '../utils/mrPhone';

function firstErr(val) {
  if (val == null) return '';
  return Array.isArray(val) ? val[0] : String(val);
}

function ForcedPasswordModal({ textDir }) {
  const { t } = useTranslation(['auth', 'common']);
  const { user, completePasswordChange } = useAuth();
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const phone = sanitizeMrPhoneDigits(user?.phone || user?.telephone || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (pwd.length < 8) {
      setErr(t('setPasswordTooShort'));
      return;
    }
    if (phone && pwd === phone) {
      setErr(t('setPasswordSameAsPhone'));
      return;
    }
    if (pwd !== pwd2) {
      setErr(t('setPasswordMismatch'));
      return;
    }
    setSubmitting(true);
    try {
      await completePasswordChange(pwd);
    } catch (error) {
      setErr(
        error?.userMessage ||
          formatApiError(error) ||
          error?.message ||
          t('setPasswordFailed'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forced-password-title"
    >
      <div
        dir={textDir}
        className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-[#f7f5f1] p-5 shadow-2xl sm:p-7"
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-navy/10 text-navy">
            <Lock size={22} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="forced-password-title" className="text-xl font-semibold text-navy">
              {t('setPasswordTitle')}
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              {[user?.prenom, user?.nom].filter(Boolean).join(' ') || user?.email}
            </p>
          </div>
        </div>

        <p className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900">
          {t('setPasswordHint')}
        </p>

        {err ? (
          <p className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-brand-red" role="alert">
            {err}
          </p>
        ) : null}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <div className="form-field-contained block">
            <label htmlFor="forced-new-password" className="login-card-field-label">
              {t('reset.newPassword')}
            </label>
            <PasswordInput
              id="forced-new-password"
              className="login-card-input"
              value={pwd}
              onChange={(e) => {
                setPwd(e.target.value);
                setErr('');
              }}
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={submitting}
            />
          </div>
          <div className="form-field-contained block">
            <label htmlFor="forced-confirm-password" className="login-card-field-label">
              {t('reset.confirmPassword')}
            </label>
            <PasswordInput
              id="forced-confirm-password"
              className="login-card-input"
              value={pwd2}
              onChange={(e) => {
                setPwd2(e.target.value);
                setErr('');
              }}
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={submitting}
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={submitting || !pwd || !pwd2}
            className="w-full min-h-[2.85rem] justify-center text-base sm:min-h-[3.25rem] sm:text-lg"
            aria-busy={submitting}
          >
            {submitting ? t('setPasswordSubmitting') : t('setPasswordSubmit')}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { t } = useTranslation(['auth', 'common']);
  const { lang } = useLocale();
  const {
    isAuthenticated,
    login,
    bootstrapped,
    mustChangePassword,
    fonction,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [emailErr, setEmailErr] = useState('');
  const [passwordErr, setPasswordErr] = useState('');
  const [formErr, setFormErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const textDir = lang === 'ar' ? 'rtl' : 'ltr';

  if (!bootstrapped) {
    return (
      <div className="relative flex h-[100dvh] max-h-[100dvh] items-center justify-center overflow-hidden bg-[#060d16] text-white">
        <p className="text-lg font-medium">{t('common:loading')}</p>
      </div>
    );
  }

  if (isAuthenticated && !mustChangePassword) {
    return <Navigate to={homePathForRole(fonction)} replace />;
  }

  const showForcedModal = isAuthenticated && mustChangePassword;
  const loginFormOk = isEspEmail(email) && password.trim().length > 0 && !submitting;

  const validateClientOrSetErrors = () => {
    setEmailErr('');
    setPasswordErr('');
    setFormErr('');
    let ok = true;
    if (!email.trim()) {
      setEmailErr(t('required'));
      ok = false;
    } else if (!isEspEmail(email)) {
      setEmailErr(t('invalidEmail'));
      ok = false;
    }
    if (!password.trim()) {
      setPasswordErr(t('passwordRequired'));
      ok = false;
    }
    return ok;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateClientOrSetErrors()) return;
    setSubmitting(true);
    setFormErr('');
    try {
      await login({
        email,
        password,
        remember_me: rememberMe,
      });
    } catch (err) {
      const d = err.response?.data;
      const code = d?.code;
      if (err.response?.status === 403 && (code === 'login_locked' || code === 'login_ip_blocked')) {
        const retry = Number(d.retry_after) || 0;
        const mins = retry ? Math.max(1, Math.ceil(retry / 60)) : 15;
        setFormErr(
          typeof d.detail === 'string' ? d.detail : t('locked', { mins }),
        );
      } else {
        if (d?.email) setEmailErr(firstErr(d.email));
        if (d?.password) setPasswordErr(firstErr(d.password));
        if (d?.non_field_errors) setFormErr(firstErr(d.non_field_errors));
        else if (d?.detail != null) {
          setFormErr(typeof d.detail === 'string' ? d.detail : formatApiError(err));
        } else if (typeof d === 'string') setFormErr(d);
        else setFormErr(formatApiError(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    /* Shell stays LTR so logo (left) and lang switch (right) never flip with AR */
    <div
      dir="ltr"
      className="login-shell relative grid h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-[#060d16] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]"
    >
      <section
        className="relative isolate min-h-0 max-h-[32dvh] overflow-hidden lg:max-h-none lg:h-full"
        aria-label={t('portalTag')}
      >
        <EspLoginBackdrop showDots={false} />

        <div className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-t from-black/70 via-black/25 to-black/35 lg:bg-gradient-to-r lg:from-black/55 lg:via-black/30 lg:to-black/15" />

        <div className="relative z-10 flex h-full flex-col p-4 sm:p-6 lg:p-10">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="pointer-events-auto shrink-0 rounded-2xl bg-white/15 p-1.5 ring-1 ring-white/30 shadow-xl backdrop-blur-md sm:p-2">
              <EspLogo
                className="h-12 w-12 sm:h-14 sm:w-14 lg:h-[4.5rem] lg:w-[4.5rem]"
                alt="ESP"
              />
            </div>
            <div className="min-w-0 pt-0.5 lg:pt-1" dir={textDir}>
              <p className="font-sans text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/85 sm:text-xs lg:text-sm">
                {t('portalTag')}
              </p>
              <h1 className="mt-1 font-sans text-2xl font-bold tracking-tight text-white drop-shadow-md sm:text-3xl lg:text-5xl xl:text-6xl">
                {t('title')}
              </h1>
            </div>
          </div>
        </div>
      </section>

      <main
        id="main-content"
        className="relative z-10 flex min-h-0 flex-col overflow-y-auto overscroll-contain bg-[#f7f5f1] lg:h-full"
      >
        <div className="flex shrink-0 items-center justify-end border-b border-slate-200/80 bg-white/90 px-4 py-3 sm:px-6 sm:py-3.5">
          <LoginLangSwitch variant="light" size="lg" />
        </div>

        <div
          dir={textDir}
          className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-4 sm:max-w-lg sm:px-8 sm:py-6 lg:max-w-xl lg:px-10"
        >
          <form
            onSubmit={handleSubmit}
            className="login-form-compact flex flex-col gap-4 font-sans sm:gap-5"
            noValidate
            aria-hidden={showForcedModal}
          >
            {formErr ? (
              <p
                id="login-form-error"
                className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-brand-red sm:text-base"
                role="alert"
              >
                {formErr}
              </p>
            ) : null}

            <div className="form-field-contained block">
              <label htmlFor="login-email" className="login-card-field-label">
                {t('email')}
              </label>
              <input
                id="login-email"
                type="email"
                className={`login-card-input ${emailErr ? 'ring-2 ring-brand-red/40' : ''}`}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailErr('');
                  setFormErr('');
                }}
                onBlur={() => {
                  const v = email.trim();
                  if (!v) return;
                  if (!isEspEmail(v)) setEmailErr(t('invalidEmail'));
                }}
                placeholder="prenom.nom@esp.mr"
                autoComplete="username"
                aria-invalid={!!emailErr}
                aria-describedby={emailErr ? 'login-email-error' : undefined}
                disabled={submitting || showForcedModal}
              />
              {emailErr ? (
                <p id="login-email-error" className="mt-1.5 text-sm font-medium text-brand-red" role="alert">
                  {emailErr}
                </p>
              ) : null}
            </div>

            <div className="form-field-contained block">
              <div className="login-card-field-label mb-1.5 flex flex-wrap items-center justify-between gap-2 sm:mb-2">
                <label htmlFor="login-password">{t('password')}</label>
                <Link
                  to="/login/recovery"
                  className="text-xs font-semibold normal-case tracking-normal text-navy underline-offset-2 hover:text-brand-red hover:underline sm:text-sm"
                  tabIndex={showForcedModal ? -1 : undefined}
                >
                  {t('forgotPassword')}
                </Link>
              </div>
              <PasswordInput
                id="login-password"
                className={`login-card-input ${passwordErr ? 'ring-2 ring-brand-red/40' : ''}`}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordErr('');
                  setFormErr('');
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                aria-invalid={!!passwordErr}
                aria-describedby={passwordErr ? 'login-password-error' : undefined}
                disabled={submitting || showForcedModal}
              />
              {passwordErr ? (
                <p id="login-password-error" className="mt-1.5 text-sm font-medium text-brand-red" role="alert">
                  {passwordErr}
                </p>
              ) : null}
            </div>

            <label className="flex cursor-pointer select-none items-center gap-3 py-0.5">
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0 rounded border-light-gray text-navy focus:ring-navy/25 sm:h-5 sm:w-5"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={submitting || showForcedModal}
              />
              <span className="text-sm leading-snug text-slate-600 sm:text-base">{t('rememberMe')}</span>
            </label>

            <div className="border-t border-light-gray pt-3 sm:pt-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={!loginFormOk || showForcedModal}
                className="w-full min-h-[2.85rem] justify-center text-base sm:min-h-[3.25rem] sm:text-lg"
                aria-busy={submitting}
              >
                {submitting ? t('submitting') : t('submit')}
              </Button>
            </div>
          </form>
        </div>
      </main>

      {showForcedModal ? <ForcedPasswordModal textDir={textDir} /> : null}
    </div>
  );
}
