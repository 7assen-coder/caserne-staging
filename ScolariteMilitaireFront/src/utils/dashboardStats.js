export function eleveNeedsAttention(e) {
  const tel = String(e.contact?.telephone ?? e.tel1 ?? '').trim();
  const badTel = !tel || tel === '00000000' || tel === 'N/A';
  const em = String(e.contact?.emailPerso ?? e.emailPerso ?? '').trim().toLowerCase();
  const badEmail = !em || em === 'user@example.com' || em.endsWith('@example.com');
  return badTel || badEmail;
}

export function alertLabelForEleve(e) {
  const tel = String(e.contact?.telephone ?? e.tel1 ?? '').trim();
  const badTel = !tel || tel === '00000000' || tel === 'N/A';
  const em = String(e.contact?.emailPerso ?? e.emailPerso ?? '').trim().toLowerCase();
  const badEmail = !em || em === 'user@example.com' || em.endsWith('@example.com');
  if (badTel && badEmail) return 'Coordonnées à compléter';
  if (badTel) return 'Téléphone à compléter';
  if (badEmail) return 'E-mail à compléter';
  return 'À suivre';
}

export function repartitionParFiliere(rows) {
  const map = new Map();
  rows.forEach((r) => {
    const label = r.scolarite?.filiere || r.scolarite?.departement || 'Non renseigné';
    if (!map.has(label)) {
      map.set(label, { total: 0, attention: 0 });
    }
    const x = map.get(label);
    x.total += 1;
    if (eleveNeedsAttention(r)) x.attention += 1;
  });
  return [...map.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([filiere, v]) => ({
      filiere,
      total: v.total,
      dossiersComplets: v.total - v.attention,
      dossiersASurveiller: v.attention,
    }));
}
