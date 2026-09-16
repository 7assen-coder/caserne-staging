import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { applyDocumentLocale, LANG_STORAGE_KEY } from '../i18n';

const LocaleContext = createContext(null);

export function LocaleProvider({ children }) {
  const { i18n } = useTranslation();
  const [lang, setLangState] = useState(() => (i18n.language?.startsWith('ar') ? 'ar' : 'fr'));

  const setLang = useCallback(
    (next) => {
      const resolved = next === 'AR' || next === 'ar' ? 'ar' : 'fr';
      void i18n.changeLanguage(resolved);
      setLangState(resolved);
      applyDocumentLocale(resolved);
      try {
        localStorage.setItem(LANG_STORAGE_KEY, resolved);
      } catch {
        /* ignore */
      }
    },
    [i18n],
  );

  useEffect(() => {
    const onChanged = (lng) => {
      const resolved = lng?.startsWith('ar') ? 'ar' : 'fr';
      setLangState(resolved);
      applyDocumentLocale(resolved);
      try {
        const skip = document.querySelector('a.skip-link');
        if (skip) skip.textContent = i18n.t('common:skipToContent');
      } catch {
        /* ignore */
      }
    };
    onChanged(i18n.language);
    i18n.on('languageChanged', onChanged);
    return () => i18n.off('languageChanged', onChanged);
  }, [i18n]);

  const value = useMemo(() => {
    const isRtl = lang === 'ar';
    return {
      lang,
      dir: isRtl ? 'rtl' : 'ltr',
      isRtl,
      setLang,
    };
  }, [lang, setLang]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook paired with provider
export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return ctx;
}
