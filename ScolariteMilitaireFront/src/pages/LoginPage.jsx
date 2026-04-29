import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import EspLoginBackdrop from '../components/login/EspLoginBackdrop';
import LoginTopBar from '../components/login/LoginTopBar';
import LoginLangSwitch from '../components/login/LoginLangSwitch';
import Button from '../components/common/Button';
import { useAuth } from '../hooks/useAuth';
import { sanitizeMrPhoneDigits, isValidMrPhone8, blockNonDigitKey } from '../utils/mrPhone';
import { formatApiError } from '../utils/apiErrors';

function isEspEmail(v) {
  const s = String(v).trim().toLowerCase();
  return /^[^\s@]+@esp\.mr$/i.test(s);
}

function firstErr(val) {
  if (val == null) return '';
  return Array.isArray(val) ? val[0] : String(val);
}

export default function LoginPage() {
  const { isAuthenticated, login, bootstrapped } = useAuth();
  const [channel, setChannel] = useState('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [sessionLongue, setSessionLongue] = useState(true);
  const [lang, setLang] = useState('FR');
  const [emailErr, setEmailErr] = useState('');
  const [phoneErr, setPhoneErr] = useState('');
  const [passwordErr, setPasswordErr] = useState('');
  const [formErr, setFormErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChannelChange = (next) => {
    setFormErr('');
    setEmailErr('');
    setPhoneErr('');
    setPasswordErr('');
    setChannel(next);
  };

  if (!bootstrapped) {
    return (
      <div className="relative flex min-h-screen min-h-[100dvh] items-center justify-center bg-[#060d16] text-white">
        <p className="text-lg font-medium">Chargement…</p>
      </div>
    );
  }

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const identifierOk = channel === 'email' ? isEspEmail(email) : isValidMrPhone8(phone);
  const loginFormOk = identifierOk && password.trim().length > 0 && !submitting;

  const validateClientOrSetErrors = () => {
    setEmailErr('');
    setPhoneErr('');
    setPasswordErr('');
    setFormErr('');
    let ok = true;
    if (channel === 'email') {
      if (!email.trim()) {
        setEmailErr('Champ requis.');
        ok = false;
      } else if (!isEspEmail(email)) {
        setEmailErr('Format invalide.');
        ok = false;
      }
    } else {
      if (!phone.trim()) {
        setPhoneErr('Champ requis.');
        ok = false;
      } else if (!isValidMrPhone8(phone)) {
        setPhoneErr('Format invalide.');
        ok = false;
      }
    }
    if (!password.trim()) {
      setPasswordErr('Mot de passe requis.');
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
        channel,
        email,
        phone,
        password,
        remember_me: sessionLongue,
      });
    } catch (err) {
      const d = err.response?.data;
      if (d?.email) setEmailErr(firstErr(d.email));
      if (d?.phone) setPhoneErr(firstErr(d.phone));
      if (d?.password) setPasswordErr(firstErr(d.password));
      if (d?.non_field_errors) setFormErr(firstErr(d.non_field_errors));
      else if (d?.detail != null) {
        setFormErr(typeof d.detail === 'string' ? d.detail : formatApiError(err));
      } else if (typeof d === 'string') setFormErr(d);
      else setFormErr(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen min-h-[100dvh] overflow-hidden bg-[#060d16]">
      <div className="absolute inset-0 z-0">
        <EspLoginBackdrop />
      </div>
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_100%_70%_at_50%_38%,rgba(5,10,18,0.42),transparent_72%)]"
        aria-hidden
      />

      <LoginTopBar lang={lang} onLangChange={setLang} logoTo="/login" prominent overlay showLanguages={false} />

      <main className="relative z-10 flex min-h-screen min-h-[100dvh] flex-col items-center justify-center px-4 sm:px-8 lg:px-12 pt-24 pb-20 sm:pt-28 sm:pb-24">
        <div className="w-full max-w-xl sm:max-w-2xl lg:max-w-3xl">
          <div className="text-center mb-8 sm:mb-10">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.32em] text-white/65 mb-3 font-sans">
              Portail scolarité
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight font-sans drop-shadow-lg">
              Connexion
            </h1>
          </div>

          <div className="rounded-3xl border border-white/[0.14] bg-white shadow-[0_24px_80px_-12px_rgba(0,0,0,0.45)] ring-1 ring-black/[0.06] overflow-hidden">
            <div className="flex items-center justify-end border-b border-light-gray px-6 py-4 sm:px-8 sm:py-5 bg-off-white/90">
              <LoginLangSwitch value={lang} onChange={setLang} variant="light" size="lg" />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-8 p-6 sm:p-10 lg:p-12 font-sans">
              <div className="space-y-6 sm:space-y-8 min-h-[14rem] sm:min-h-[15rem]">
                {formErr ? (
                  <p className="text-base sm:text-lg font-medium text-brand-red bg-red-50 border border-red-100 rounded-xl px-4 py-3.5">
                    {formErr}
                  </p>
                ) : null}

                <div className="space-y-6 sm:space-y-7">
                  <p className="text-base sm:text-lg text-text-light leading-snug">
                    Espace personnel — accès sécurisé.
                  </p>
                  <div>
                    <span className="login-card-field-label">Connexion</span>
                    <div className="flex rounded-xl border-2 border-light-gray p-1 bg-off-white gap-1">
                      <button
                        type="button"
                        onClick={() => handleChannelChange('email')}
                        className={`flex-1 rounded-lg py-3.5 sm:py-4 text-base sm:text-lg font-bold transition ${
                          channel === 'email'
                            ? 'bg-white text-navy shadow-md ring-2 ring-navy/10'
                            : 'text-text-light hover:text-navy'
                        }`}
                      >
                        E-mail
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChannelChange('phone')}
                        className={`flex-1 rounded-lg py-3.5 sm:py-4 text-base sm:text-lg font-bold transition ${
                          channel === 'phone'
                            ? 'bg-white text-navy shadow-md ring-2 ring-navy/10'
                            : 'text-text-light hover:text-navy'
                        }`}
                      >
                        Téléphone
                      </button>
                    </div>
                  </div>
                  {channel === 'email' ? (
                    <label className="block">
                      <span className="login-card-field-label">E-mail</span>
                      <input
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
                          if (!isEspEmail(v)) setEmailErr('Format invalide.');
                        }}
                        placeholder="prenom.nom@esp.mr"
                        autoComplete="username"
                      />
                      {emailErr ? (
                        <p className="mt-2 text-sm font-medium text-brand-red">{emailErr}</p>
                      ) : null}
                    </label>
                  ) : (
                    <label className="block">
                      <span className="login-card-field-label">Mobile</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="tel-national"
                        maxLength={8}
                        className={`login-card-input font-mono tracking-widest ${phoneErr ? 'ring-2 ring-brand-red/40' : ''}`}
                        value={phone}
                        onChange={(e) => {
                          setPhone(sanitizeMrPhoneDigits(e.target.value));
                          setPhoneErr('');
                          setFormErr('');
                        }}
                        onBlur={() => {
                          const v = phone.trim();
                          if (!v) return;
                          if (!isValidMrPhone8(v)) setPhoneErr('Format invalide.');
                        }}
                        onKeyDown={blockNonDigitKey}
                        placeholder="31234567"
                      />
                      {phoneErr ? (
                        <p className="mt-2 text-sm font-medium text-brand-red">{phoneErr}</p>
                      ) : null}
                    </label>
                  )}
                  <label className="block">
                    <span className="login-card-field-label flex flex-wrap items-center justify-between gap-2">
                      <span>Mot de passe</span>
                      <Link
                        to="/login/recovery"
                        className="text-sm sm:text-base font-semibold normal-case tracking-normal text-navy hover:text-brand-red"
                      >
                        Mot de passe oublié
                      </Link>
                    </span>
                    <input
                      type="password"
                      className={`login-card-input ${passwordErr ? 'ring-2 ring-brand-red/40' : ''}`}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordErr('');
                        setFormErr('');
                      }}
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                    {passwordErr ? (
                      <p className="mt-2 text-sm font-medium text-brand-red">{passwordErr}</p>
                    ) : null}
                  </label>
                  <label className="flex items-center gap-4 cursor-pointer select-none py-1">
                    <input
                      type="checkbox"
                      className="h-5 w-5 sm:h-6 sm:w-6 rounded border-light-gray text-navy focus:ring-navy/25 shrink-0"
                      checked={sessionLongue}
                      onChange={(e) => setSessionLongue(e.target.checked)}
                    />
                    <span className="text-base sm:text-lg text-text-light leading-snug">Rester connecté</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-light-gray">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={!loginFormOk}
                  className="w-full justify-center min-h-[3.5rem] sm:min-h-[3.75rem] text-lg"
                >
                  {submitting ? 'Connexion…' : 'Se connecter'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
