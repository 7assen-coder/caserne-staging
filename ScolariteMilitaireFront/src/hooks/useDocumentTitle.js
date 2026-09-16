import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const TITLE_BY_PATH = [
  { match: /^\/login/, key: 'auth:title' },
  { match: /^\/dashboard/, key: 'modules:dashboard' },
  { match: /^\/eleves\/dossiers|^\/eleves\/nouveau/, key: 'eleves:pageTitle' },
  { match: /^\/eleves\/sanctions/, key: 'modules:sanctions' },
  { match: /^\/eleves\/equipement/, key: 'modules:equipement' },
  { match: /^\/eleves\/demandes/, key: 'modules:demandes' },
  { match: /^\/eleves\/suivi-medical/, key: 'modules:medical' },
  { match: /^\/eleves\/journal/, key: 'modules:journal' },
  { match: /^\/eleves\/scolarite/, key: 'modules:scolarite' },
  { match: /^\/eleves\/droits/, key: 'modules:droits' },
  { match: /^\/eleves\/presence/, key: 'modules:presence' },
];

export function useDocumentTitle() {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation(['auth', 'modules', 'eleves', 'common']);

  useEffect(() => {
    const hit = TITLE_BY_PATH.find((r) => r.match.test(pathname));
    const page = hit ? t(hit.key) : t('common:appName');
    document.title = `${page} — ${t('common:appName')}`;
  }, [pathname, t, i18n.language]);
}
