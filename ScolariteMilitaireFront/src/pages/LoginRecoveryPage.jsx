import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Lock, Mail } from 'lucide-react';
import LoginTopBar from '../components/login/LoginTopBar';

const STEPS = [
  { id: 0, label: 'Email' },
  { id: 1, label: 'Code OTP' },
  { id: 2, label: 'Mot de passe' },
];

const DEMO_OTP = '123456'; /* remplacer par flux API en prod. */

function isEspEmail(v) {
  const s = String(v).trim().toLowerCase();
  return /^[^\s@]+@esp\.mr$/i.test(s);
}

export default function LoginRecoveryPage() {
  const navigate = useNavigate();
  const [lang, setLang] = useState('FR');
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [err, setErr] = useState('');

  const sendOtp = (e) => {
    e.preventDefault();
    setErr('');
    if (!isEspEmail(email)) {
      setErr('Saisissez une adresse se terminant par @esp.mr');
      return;
    }
    setStep(1);
  };

  const verifyOtp = (e) => {
    e.preventDefault();
    setErr('');
    if (otp.replace(/\s/g, '') !== DEMO_OTP) {
      setErr('Code non reconnu.');
      return;
    }
    setStep(2);
  };

  const finish = (e) => {
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
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#ebe6dc] relative overflow-hidden font-sans">
      <div className="pointer-events-none absolute inset-0 login-panel-glow opacity-80" aria-hidden />
      <LoginTopBar lang={lang} onLangChange={setLang} logoTo="/login" prominent />

      <main className="relative z-10 mx-auto max-w-md px-4 pt-24 sm:pt-28 pb-16">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm font-semibold text-navy-800 hover:text-navy-950 mb-6"
        >
          <ArrowLeft size={18} />
          Retour à la connexion
        </Link>

        <div className="bg-white/95 backdrop-blur-md rounded-xl border border-light-gray/85 shadow-[0_6px_28px_rgba(15,27,51,0.07)] overflow-hidden">
          <div className="px-5 sm:px-6 pt-6 pb-1">
            <h1 className="text-xl sm:text-2xl font-semibold text-navy-900 tracking-tight">Mot de passe oublié</h1>
            <p className="text-text-light mt-1.5 text-sm">E-mail, code reçu, puis nouveau mot de passe.</p>
          </div>

          <div className="px-4 sm:px-6 py-4 border-y border-light-gray/80 bg-off-white/50">
            <div className="flex items-stretch justify-between gap-1">
              {STEPS.map((s, i) => {
                const done = i < step;
                const act = i === step;
                return (
                  <div key={s.id} className="flex-1 min-w-0 flex flex-col items-center gap-1.5">
                    <span
                      className={`w-9 h-9 rounded-full text-xs font-bold flex items-center justify-center border-2 transition ${
                        act
                          ? 'bg-navy-900 text-white border-navy-900'
                          : done
                            ? 'bg-esp-green text-white border-esp-green'
                            : 'bg-white text-text-light border-light-gray'
                      }`}
                    >
                      {done ? <Check size={16} /> : i + 1}
                    </span>
                    <span
                      className={`text-[10px] sm:text-xs text-center leading-tight ${
                        act ? 'font-semibold text-navy-900' : 'text-text-light'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <form className="p-5 sm:p-6 space-y-4" onSubmit={step === 0 ? sendOtp : step === 1 ? verifyOtp : finish}>
            {err && (
              <p className="text-sm font-medium text-brand-red bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {err}
              </p>
            )}

            {step === 0 && (
              <>
                <label className="block">
                  <span className="label">Email institutionnel</span>
                  <div className="relative">
                    <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="email"
                      className="login-input login-input-compact pl-11"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="prenom.nom@esp.mr"
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </label>
                <button
                  type="submit"
                  className="w-full btn btn-primary btn-lg justify-center gap-2 rounded-xl shadow-md"
                >
                  Recevoir un code OTP
                  <ArrowRight size={18} />
                </button>
              </>
            )}

            {step === 1 && (
              <>
                <p className="text-xs text-text leading-snug">
                  Code envoyé à <span className="font-medium text-navy-900">{email}</span>.
                </p>
                <label className="block">
                  <span className="label">Code OTP</span>
                  <input
                    className="login-input login-input-compact text-center text-xl tracking-[0.3em] font-mono"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="······"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                  />
                </label>
                <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-between">
                  <button type="button" className="btn btn-secondary rounded-xl" onClick={() => setStep(0)}>
                    <ArrowLeft size={18} /> Précédent
                  </button>
                  <button type="submit" className="btn btn-primary btn-lg rounded-xl gap-2">
                    Vérifier le code
                    <ArrowRight size={18} />
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <label className="block">
                  <span className="label">Nouveau mot de passe</span>
                  <div className="relative">
                    <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="password"
                      className="login-input login-input-compact pl-11"
                      value={pwd}
                      onChange={(e) => setPwd(e.target.value)}
                      autoComplete="new-password"
                      autoFocus
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="label">Confirmer le mot de passe</span>
                  <div className="relative">
                    <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="password"
                      className="login-input login-input-compact pl-11"
                      value={pwd2}
                      onChange={(e) => setPwd2(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </label>
                <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-between">
                  <button type="button" className="btn btn-secondary rounded-xl" onClick={() => setStep(1)}>
                    <ArrowLeft size={18} /> Précédent
                  </button>
                  <button type="submit" className="btn btn-primary btn-lg rounded-xl">
                    Enregistrer et retour
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
