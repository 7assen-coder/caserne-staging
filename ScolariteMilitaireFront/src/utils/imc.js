function parseNum(v) {
  if (v == null) return NaN;
  const s = String(v).trim().replace(',', '.');
  if (!s) return NaN;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

export function computeIMC(poidsKg, tailleCm) {
  const p = parseNum(poidsKg);
  const tCm = parseNum(tailleCm);
  if (!Number.isFinite(p) || !Number.isFinite(tCm) || tCm <= 0 || p <= 0) {
    return null;
  }
  const tM = tCm / 100;
  const imc = p / (tM * tM);
  if (!Number.isFinite(imc) || imc <= 0 || imc > 200) return null;
  return Math.round(imc * 10) / 10;
}

/**
 * WHO adult BMI classes. Returns { code, tone } — UI maps code → i18n label.
 * tone: green | amber | red
 */
export function classifyIMC(imc) {
  if (imc == null || !Number.isFinite(imc)) return null;
  if (imc < 16) return { code: 'maigreurSevere', tone: 'red' };
  if (imc < 17) return { code: 'maigreurModeree', tone: 'amber' };
  if (imc < 18.5) return { code: 'maigreurLegere', tone: 'amber' };
  if (imc < 25) return { code: 'normale', tone: 'green' };
  if (imc < 30) return { code: 'surpoids', tone: 'amber' };
  if (imc < 35) return { code: 'obesite1', tone: 'red' };
  if (imc < 40) return { code: 'obesite2', tone: 'red' };
  return { code: 'obesite3', tone: 'red' };
}

/** Fallback FR labels when i18n is unavailable (fiche/PDF). */
export const IMC_LABELS_FR = {
  maigreurSevere: 'Maigreur sévère',
  maigreurModeree: 'Maigreur modérée',
  maigreurLegere: 'Maigreur légère',
  normale: 'Corpulence normale',
  surpoids: 'Surpoids',
  obesite1: 'Obésité classe I',
  obesite2: 'Obésité classe II',
  obesite3: 'Obésité classe III',
};

export function imcLabelFr(klass) {
  if (!klass?.code) return '';
  return IMC_LABELS_FR[klass.code] || '';
}

export function formatIMC(imc) {
  if (imc == null || !Number.isFinite(imc)) return '';
  return imc.toFixed(1);
}

/** e.g. "31.7 · Obésité classe I" */
export function formatIMCWithClass(imc, klass = classifyIMC(imc)) {
  const v = formatIMC(imc);
  if (!v) return '';
  const label = imcLabelFr(klass);
  return label ? `${v} · ${label}` : v;
}
