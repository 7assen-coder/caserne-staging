export function computeDroitsStats(rows = []) {
  const total = rows.length;
  const percu = rows.filter((r) => r.etat === 'percu').length;
  const nonPercu = rows.filter((r) => r.etat !== 'percu').length;
  const montantTotal = rows.reduce((sum, r) => sum + (Number(r.montant) || 0), 0);
  const montantPercu = rows
    .filter((r) => r.etat === 'percu')
    .reduce((sum, r) => sum + (Number(r.montant) || 0), 0);

  return { total, percu, nonPercu, montantTotal, montantPercu };
}
