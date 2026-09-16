import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import frCommon from '../locales/fr/common.json';
import frAuth from '../locales/fr/auth.json';
import frNav from '../locales/fr/nav.json';
import frEleves from '../locales/fr/eleves.json';
import frModules from '../locales/fr/modules.json';
import frErrors from '../locales/fr/errors.json';
import frA11y from '../locales/fr/a11y.json';
import frProfile from '../locales/fr/profile.json';
import frAudit from '../locales/fr/audit.json';
import frDashboard from '../locales/fr/dashboard.json';

import arCommon from '../locales/ar/common.json';
import arAuth from '../locales/ar/auth.json';
import arNav from '../locales/ar/nav.json';
import arEleves from '../locales/ar/eleves.json';
import arModules from '../locales/ar/modules.json';
import arErrors from '../locales/ar/errors.json';
import arA11y from '../locales/ar/a11y.json';
import arProfile from '../locales/ar/profile.json';
import arAudit from '../locales/ar/audit.json';
import arDashboard from '../locales/ar/dashboard.json';

export const LANG_STORAGE_KEY = 'polyspace_lang';
export const SUPPORTED_LANGS = ['fr', 'ar'];

function readStoredLang() {
  try {
    const v = localStorage.getItem(LANG_STORAGE_KEY);
    if (v === 'ar' || v === 'fr') return v;
  } catch {
    /* ignore */
  }
  return 'fr';
}

export function applyDocumentLocale(lang) {
  const resolved = lang === 'ar' ? 'ar' : 'fr';
  const dir = resolved === 'ar' ? 'rtl' : 'ltr';
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.lang = resolved;
    root.dir = dir;
    root.setAttribute('data-lang', resolved);
  }
  return { lang: resolved, dir, isRtl: dir === 'rtl' };
}

void i18n.use(initReactI18next).init({
  resources: {
    fr: {
      common: frCommon,
      auth: frAuth,
      nav: frNav,
      eleves: frEleves,
      modules: frModules,
      errors: frErrors,
      a11y: frA11y,
      profile: frProfile,
      audit: frAudit,
      dashboard: frDashboard,
    },
    ar: {
      common: arCommon,
      auth: arAuth,
      nav: arNav,
      eleves: arEleves,
      modules: arModules,
      errors: arErrors,
      a11y: arA11y,
      profile: arProfile,
      audit: arAudit,
      dashboard: arDashboard,
    },
  },
  lng: readStoredLang(),
  fallbackLng: 'fr',
  defaultNS: 'common',
  ns: ['common', 'auth', 'nav', 'eleves', 'modules', 'errors', 'a11y', 'profile', 'audit', 'dashboard'],
  interpolation: { escapeValue: false },
  returnNull: false,
});

applyDocumentLocale(i18n.language);

i18n.on('languageChanged', (lng) => {
  applyDocumentLocale(lng);
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lng === 'ar' ? 'ar' : 'fr');
  } catch {
    /* ignore */
  }
});

export default i18n;
