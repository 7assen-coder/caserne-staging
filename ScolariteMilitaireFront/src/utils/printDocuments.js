import { INSTITUTION } from '../data/institution';
import { getAnneeEntiereIrt, anneeDepuisCycle } from '../data/espProgrammeIrt';
import { getDecisionCode, DECISION_CODE_LABELS } from './gradeDecision';
import { formatDate } from './formatters';
import { enrichirModuleAvecReferenceEsp, formationUrl, departementCodeDepuisFiliere } from '../data/espFormationCatalog';

const CSS_PRINT = `
  @page { margin: 14mm; }
  body { font-family: Georgia, "Times New Roman", serif; color: #0f172a; line-height: 1.35; max-width: 210mm; margin: 0 auto; padding: 10px; font-size: 10pt; }
  .hdr { text-align: center; border-bottom: 2px solid #1B2A4A; padding-bottom: 10px; margin-bottom: 12px; }
  .logo { width: 52px; height: 52px; object-fit: contain; margin: 0 auto 6px; display: block; }
  .h1 { font-size: 1.15rem; font-weight: 700; letter-spacing: 0.02em; }
  .sub { color: #475569; font-size: 0.88rem; }
  h2 { font-size: 0.95rem; color: #1B2A4A; margin: 14px 0 6px; }
  .releve-table, .offre-table { width: 100%; border-collapse: collapse; font-size: 7.5pt; table-layout: fixed; }
  .releve-table th, .releve-table td, .offre-table th, .offre-table td { border: 1px solid #64748b; padding: 4px 5px; text-align: left; word-wrap: break-word; vertical-align: top; }
  .releve-table th, .offre-table th { background: #e2e8f0; font-weight: 600; color: #0f172a; }
  .num { text-align: center; font-variant-numeric: tabular-nums; }
  .sig { margin-top: 28px; text-align: right; }
  .muted { color: #64748b; font-size: 0.78rem; }
  .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; margin: 10px 0; }
  .meta { font-size: 0.82rem; margin-bottom: 8px; }
`;

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function openPrintFromHtmlString(title, innerBodyMarkup) {
  const docHtml = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title><style>${CSS_PRINT}</style></head>
<body>${innerBodyMarkup}</body></html>`;
  const blob = new Blob([docHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (w) {
    w.addEventListener('load', () => {
      w.focus();
      setTimeout(() => {
        w.print();
        URL.revokeObjectURL(url);
      }, 200);
    });
  } else {
    URL.revokeObjectURL(url);
  }
}

function rowsOffreHtml(mods) {
  return (mods || [])
    .map(
      (m) =>
        `<tr>
          <td>${escapeHtml(m.code)}</td>
          <td>${escapeHtml(m.intitule)}</td>
          <td class="num">${escapeHtml(m.ue || '—')}</td>
          <td>${escapeHtml(m.pole || '—')}</td>
          <td class="num">${m.heuresTotal ?? '—'}</td>
          <td class="num">${m.cm ?? '—'} / ${m.td ?? '—'} / ${m.tp ?? '—'}</td>
          <td class="num">${m.credits ?? '—'}</td>
        </tr>`,
    )
    .join('');
}

function rowsReleveHtml(modules) {
  return (modules || [])
    .map((raw) => {
      const m = enrichirModuleAvecReferenceEsp(raw);
      const c = getDecisionCode(raw);
      const dec = escapeHtml((DECISION_CODE_LABELS[c] || c).replace(/^Em — /, ''));
      const hasVol = m.cm != null || m.td != null || m.tp != null;
      const cmtp = !hasVol ? '—' : `${m.cm ?? 0} / ${m.td ?? 0} / ${m.tp ?? 0}`;
      return `<tr>
        <td>${escapeHtml(m.code)}</td>
        <td>${escapeHtml(m.intitule)}</td>
        <td class="num">${escapeHtml(m.ue || '—')}</td>
        <td>${escapeHtml(m.pole || '—')}</td>
        <td class="num">${m.heuresTotal ?? '—'}</td>
        <td class="num">${escapeHtml(cmtp)}</td>
        <td class="num">${m.credit}</td>
        <td class="num">${m.note}</td>
        <td class="num" style="font-weight:700">${escapeHtml(c)}</td>
        <td class="muted">${dec}</td>
      </tr>`;
    })
    .join('');
}

export function printAttestationParcoursIrt(eleve) {
  const annee = anneeDepuisCycle(eleve.cycle);
  const fil = eleve.scolarite?.filiere || eleve.filiere;
  const prog = getAnneeEntiereIrt(annee, fil);
  const dept = departementCodeDepuisFiliere(fil);
  const urlForm = formationUrl(dept);
  const d = new Date();
  const dateRef = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const logo = INSTITUTION.logoUrl ? `<img class="logo" src="${INSTITUTION.logoUrl}" alt="" />` : '';

  const inner = `
  <div class="hdr">
    ${logo}
    <div class="h1">${escapeHtml(INSTITUTION.nomComplet)}</div>
    <div class="sub">Attestation de parcours pédagogique — ${escapeHtml(dept.toUpperCase())} · ${annee}e année</div>
  </div>
  <p class="meta"><strong>Offre de formation (référence) :</strong> <a href="${urlForm}">${urlForm}</a></p>
  <div class="box">
    <strong>${escapeHtml(eleve.prenom)} ${escapeHtml(eleve.nom)}</strong> — ${escapeHtml(eleve.matricule)}<br/>
    Filière : ${escapeHtml(fil ?? '—')}
  </div>
  <h2>Semestre 1 (extrait page Formation : code, UE, pôle, H, CM/TD/TP, ECTS)</h2>
  <table class="offre-table">
    <thead><tr>
      <th>Code</th><th>Module</th><th>UE</th><th>Pôle</th><th>H</th><th>CM / TD / TP</th><th>ECTS</th>
    </tr></thead>
    <tbody>${rowsOffreHtml(prog.S1)}</tbody>
  </table>
  <h2>Semestre 2</h2>
  <table class="offre-table">
    <thead><tr>
      <th>Code</th><th>Module</th><th>UE</th><th>Pôle</th><th>H</th><th>CM / TD / TP</th><th>ECTS</th>
    </tr></thead>
    <tbody>${rowsOffreHtml(prog.S2)}</tbody>
  </table>
  <p class="muted">Total crédits (indicatif) : ${prog.totalCredits} — mêmes champs que la section Formation du site.</p>
  <div class="sig">
    <div>Fait à ${escapeHtml(INSTITUTION.adresse)}, le ${dateRef}</div>
    <div style="margin-top:22px;font-weight:600">${escapeHtml(INSTITUTION.signatureLibelle)}</div>
    <div class="muted">(${INSTITUTION.cachetMention})</div>
  </div>
  `;
  openPrintFromHtmlString('Attestation parcours', inner);
}

export function printReleveSemestreHtml(eleve, semestreIndex = 0) {
  const releves = eleve.relevesSemestres;
  if (!releves?.length) {
    window.alert('Aucun relevé de notes disponible pour la démonstration.');
    return;
  }
  const block = releves[Math.min(semestreIndex, releves.length - 1)];
  const d = new Date();
  const dateRef = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const logo = INSTITUTION.logoUrl ? `<img class="logo" src="${INSTITUTION.logoUrl}" alt="" />` : '';
  const fUrl = formationUrl(departementCodeDepuisFiliere(eleve.scolarite?.filiere || eleve.filiere));

  const inner = `
  <div class="hdr">
    ${logo}
    <div class="h1">${escapeHtml(INSTITUTION.nomComplet)}</div>
    <div class="sub">Relevé de notes (relevé en ligne)</div>
    <div class="sub" style="margin-top:2px"><strong>${escapeHtml(block.periode)}</strong></div>
  </div>
  <p class="meta"><strong>Catalogue formation :</strong> <a href="${fUrl}">${fUrl}</a></p>
  <div class="box">
    <strong>${escapeHtml(eleve.prenom)} ${escapeHtml(eleve.nom)}</strong> — ${escapeHtml(eleve.matricule)}<br/>
    Né(e) le ${escapeHtml(formatDate(eleve.dateNaissance) || '—')} · Filière : ${escapeHtml(eleve.scolarite?.filiere || eleve.filiere || '—')}
  </div>
  <table class="releve-table">
    <thead>
      <tr>
        <th>Code</th>
        <th>Intitulé</th>
        <th>UE</th>
        <th>Pôle</th>
        <th>H</th>
        <th>CM / TD / TP</th>
        <th>ECTS</th>
        <th>Note/20</th>
        <th>Déc.</th>
        <th>Décision (Em)</th>
      </tr>
    </thead>
    <tbody>${rowsReleveHtml(block.modules)}</tbody>
  </table>
  <p><strong>Moyenne générale :</strong> ${escapeHtml(String(block.moyenneGenerale))} &nbsp;·&nbsp;
  <strong>Crédits :</strong> ${block.creditObtenu} / ${block.creditTotal} &nbsp;·&nbsp;
  <strong>Décision :</strong> ${escapeHtml(block.resultat)}</p>
  <p class="muted">Légende : V, NV, E, VCI, VCE — pas de mention sur ce relevé.</p>
  <div class="sig">
    <div>Fait à ${escapeHtml(INSTITUTION.adresse)}, le ${dateRef}</div>
    <div style="margin-top:18px;font-weight:600">Le responsable de la scolarité</div>
  </div>
  `;
  openPrintFromHtmlString('Relevé de notes', inner);
}
