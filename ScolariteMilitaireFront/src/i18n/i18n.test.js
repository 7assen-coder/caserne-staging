import i18n, { applyDocumentLocale } from './index';

describe('i18n locale', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('dir');
    document.documentElement.removeAttribute('lang');
  });

  it('defaults to French and applies ltr', async () => {
    await i18n.changeLanguage('fr');
    const meta = applyDocumentLocale('fr');
    expect(meta.lang).toBe('fr');
    expect(meta.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('fr');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('switches to Arabic rtl and translates auth title', async () => {
    await i18n.changeLanguage('ar');
    const meta = applyDocumentLocale('ar');
    expect(meta.isRtl).toBe(true);
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
    expect(i18n.t('auth:title')).toMatch(/تسجيل|دخول/);
  });
});
