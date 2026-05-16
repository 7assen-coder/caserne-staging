import { DEPARTEMENTS } from '../utils/constants';
import { eleves } from './mockData';

export function createDemandesInscriptionMobile() {
  return eleves.slice(0, 15).map((e, i) => {
    const isReinsc = i % 3 === 0;
    const dept = DEPARTEMENTS[(i + 2) % DEPARTEMENTS.length];
    const decision = i < 11 ? 'en_attente' : i === 11 ? 'acceptee' : 'refusee';
    const piecesComplet = i % 5 !== 0;

    const candidat = {
      matricule: isReinsc ? e.matricule : '',
      nom: e.nom,
      prenom: e.prenom,
      nomAr: e.nomAr,
      nni: e.nni,
      numeroBac: e.numeroBac,
      dateNaissance: e.dateNaissance,
      lieuNaissance: e.lieuNaissance,
      nationalite: e.nationalite,
      categorieBac: e.categorieBac,
      serieBac: e.serieBac,
      ecoleBac: e.ecoleBac,
      sexe: e.sexe,
      filiere: e.filiere,
      scolarite: { ...e.scolarite },
      parents: { ...e.parents },
      contact: {
        telephone: e.contact.telephone,
        tel2: e.contact.tel2,
        /* @esp.mr : attribué côté établissement si première inscription */
        emailPro: isReinsc ? e.contact.emailPro : '',
        emailPerso: e.contact.emailPerso,
        adresse: e.contact.adresse,
        adresseSecondaire: e.contact.adresseSecondaire ?? '',
      },
      residentAvecParents: e.residentAvecParents,
      compteBankily: e.compteBankily,
      photoCandidat: `https://i.pravatar.cc/900?img=${10 + (i % 60)}`,
    };

    const emailNotif = e.contact.emailPerso || e.contact.emailPro || e.contact.email;
    const whatsapp = e.contact.tel2 || e.contact.telephone;

    const seedDoc = 200 + i;
    const fichiersPieces = {
      carteIdentite: {
        nom: 'piece_identite_2026.jpg',
        taille: '420 Ko',
        type: 'image',
        apercuUrl: `https://picsum.photos/seed/espid${seedDoc}/600/800`,
      },
      releveBac: {
        nom: 'releve_bac_officiel.pdf',
        taille: '1,1 Mo',
        type: 'pdf',
        apercuUrl: `https://picsum.photos/seed/espbac${seedDoc}/600/800`,
      },
      releveNotesSemestres: {
        nom: 'releves_s1s5.pdf',
        taille: '2,3 Mo',
        type: 'pdf',
        apercuUrl: `https://picsum.photos/seed/esprns${seedDoc}/600/800`,
      },
      diplomeBac: {
        nom: 'attestation_diplome.pdf',
        taille: '890 Ko',
        type: 'pdf',
        apercuUrl: `https://picsum.photos/seed/espdip${seedDoc}/600/800`,
      },
    };

    return {
      id: `dm-${3000 + i}`,
      type: isReinsc ? 'reinscription' : 'nouvelle_inscription',
      decision,
      statutPieces: piecesComplet ? 'complet' : 'incomplet',
      dateSoumission: `2026-04-${String(24 - (i % 8)).padStart(2, '0')}T${10 + (i % 8)}:30:00.000Z`,
      dateTraitement: decision !== 'en_attente' ? `2026-04-${String(25 - (i % 4)).padStart(2, '0')}T14:00:00.000Z` : null,
      departementCode: dept.value,
      appMobile: { plateforme: i % 2 === 0 ? 'Android' : 'iOS', version: `2.${(i % 5) + 1}.${i % 10}` },
      emailNotif,
      whatsappNotif: whatsapp,
      candidat,
      validationsParPiece: {},
      fichiersPieces,
      pieces: {
        carteIdentite: piecesComplet ? 'recu' : 'manquant',
        releveBac: 'recu',
        releveNotesSemestres: isReinsc ? 'recu' : 'non_applicable',
        diplomeBac: piecesComplet ? 'recu' : 'en_verification',
      },
      motifRefus: decision === 'refusee' ? 'Pièces non conformes (démo).' : null,
      messageRefus: decision === 'refusee' ? 'Veuillez téléverser une copie lisible du relevé de notes.' : null,
    };
  });
}

export const demandesInscriptionMobile = createDemandesInscriptionMobile();

export function statsInscriptionsFromDemandes(demandes) {
  const pending = demandes.filter((d) => d.decision === 'en_attente').length;
  const acceptees = demandes.filter((d) => d.decision === 'acceptee').length;
  const refusees = demandes.filter((d) => d.decision === 'refusee').length;
  const piecesManquantes = demandes.filter((d) => d.statutPieces === 'incomplet' && d.decision === 'en_attente').length;
  return {
    confirmeesTotal: 1211 + acceptees,
    enFile: pending,
    aRelancer: piecesManquantes || 12,
    traiteesSession: acceptees + refusees,
  };
}
