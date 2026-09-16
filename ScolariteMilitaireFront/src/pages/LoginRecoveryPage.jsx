import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import EspLoginBackdrop from '../components/login/EspLoginBackdrop';
import LoginLangSwitch from '../components/login/LoginLangSwitch';
import EspLogo from '../components/common/EspLogo';
import PasswordResetSection from '../components/profile/PasswordResetSection';
import { useAuth } from '../hooks/useAuth';
import { useLocale } from '../context/LocaleContext';

export default function LoginRecoveryPage() {
  const navigate = useNavigate();
  const { isAuthenticated, bootstrapped } = useAuth();
  const { t } = useTranslation(['auth', 'common']);
  const { lang } = useLocale();
  const textDir = lang === 'ar' ? 'rtl' : 'ltr';

  if (!bootstrapped) {
    return (
      <div className="relative flex h-[100dvh] max-h-[100dvh] items-center justify-center overflow-hidden bg-[#060d16] text-white">
        <p className="text-lg font-medium">{t('common:loading')}</p>
      </div>
    );
  }

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
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
            <Link
              to="/login"
              className="pointer-events-auto shrink-0 rounded-2xl bg-white/15 p-1.5 ring-1 ring-white/30 shadow-xl backdrop-blur-md transition hover:bg-white/22 sm:p-2"
              aria-label="Polyspace"
            >
              <EspLogo
                className="h-12 w-12 sm:h-14 sm:w-14 lg:h-[4.5rem] lg:w-[4.5rem]"
                alt="ESP"
              />
            </Link>
            <div className="min-w-0 pt-0.5 lg:pt-1" dir={textDir}>
              <p className="font-sans text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/85 sm:text-xs lg:text-sm">
                {t('portalTag')}
              </p>
              <h1 className="mt-1 font-sans text-2xl font-bold tracking-tight text-white drop-shadow-md sm:text-3xl lg:text-4xl xl:text-5xl">
                {t('forgotPassword')}
              </h1>
            </div>
          </div>
        </div>
      </section>

      <main
        id="main-content"
        className="relative z-10 flex min-h-0 flex-col overflow-y-auto overscroll-contain bg-[#f7f5f1] lg:h-full"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-3 sm:px-6 sm:py-3.5">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-navy-800 hover:text-navy-950"
          >
            <ArrowLeft size={18} aria-hidden />
            <span dir={textDir}>{t('auth:title')}</span>
          </Link>
          <LoginLangSwitch variant="light" size="lg" />
        </div>

        <div
          dir={textDir}
          className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-4 sm:max-w-lg sm:px-8 sm:py-6 lg:max-w-xl lg:px-10"
        >
          <PasswordResetSection onSuccess={() => navigate('/login', { replace: true })} />
        </div>
      </main>
    </div>
  );
}
