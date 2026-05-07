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

export function classifyIMC(imc) {
  if (imc == null || !Number.isFinite(imc)) return null;
  if (imc < 16.5) return { label: 'Maigreur sévère', tone: 'red', code: 'maigreur-severe' };
  if (imc < 18.5) return { label: 'Maigreur', tone: 'amber', code: 'maigreur' };
  if (imc < 25) return { label: 'Corpulence normale', tone: 'green', code: 'normal' };
  if (imc < 30) return { label: 'Surpoids', tone: 'amber', code: 'surpoids' };
  if (imc < 35) return { label: 'Obésité modérée (classe I)', tone: 'red', code: 'obesite-1' };
  if (imc < 40) return { label: 'Obésité sévère (classe II)', tone: 'red', code: 'obesite-2' };
  return { label: 'Obésité morbide (classe III)', tone: 'red', code: 'obesite-3' };
}

export function formatIMC(imc) {
  if (imc == null || !Number.isFinite(imc)) return '';
  return imc.toFixed(1).replace('.', ',');
}
