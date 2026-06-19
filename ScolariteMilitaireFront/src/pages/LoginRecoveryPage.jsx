import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import LoginTopBar from '../components/login/LoginTopBar';
import PasswordResetSection from '../components/profile/PasswordResetSection';
import { useAuth } from '../hooks/useAuth';
import { useState } from 'react';

export default function LoginRecoveryPage() {
  const navigate = useNavigate();
  const { isAuthenticated, bootstrapped } = useAuth();
  const [lang, setLang] = useState('FR');

  if (!bootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#ebe6dc] font-medium text-navy">
        Chargement…
      </div>
    );
  }

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

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
            <p className="text-text-light mt-1.5 text-sm">
              E-mail institutionnel, code OTP, puis nouveau mot de passe.
            </p>
          </div>

          <div className="p-5 sm:p-6 border-t border-light-gray/80">
            <PasswordResetSection onSuccess={() => navigate('/login', { replace: true })} />
          </div>
        </div>
      </main>
    </div>
  );
}
