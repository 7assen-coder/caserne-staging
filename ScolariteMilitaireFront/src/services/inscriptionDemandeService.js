import { mockDelay } from './api';
import { demandesInscriptionMobile as seed } from '../data/inscriptionDemandesMock';
import { eleveService } from './eleveService';

let demandes = seed.map((d) => ({
  ...d,
  pieces: { ...d.pieces },
  validationsParPiece: d.validationsParPiece ? { ...d.validationsParPiece } : {},
  fichiersPieces: d.fichiersPieces ? { ...d.fichiersPieces } : {},
  candidat: {
    ...d.candidat,
    scolarite: { ...d.candidat.scolarite },
    contact: { ...d.candidat.contact },
    parents: d.candidat.parents ? { ...d.candidat.parents } : {},
  },
}));

function matchQ(d, q) {
  if (!q) return true;
  const s = q.toLowerCase();
  const c = d.candidat;
  return (
    c.nom.toLowerCase().includes(s) ||
    c.prenom.toLowerCase().includes(s) ||
    (c.matricule && c.matricule.toLowerCase().includes(s)) ||
    c.nni.includes(s)
  );
}

function slugifyPart(s) {
  return (
    String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '') || 'etudiant'
  );
}

export function genererEmailPro(candidat) {
  const parts = (candidat.nom || '').split(/\s+/).filter(Boolean);
  const last = parts.length ? parts[parts.length - 1] : 'nom';
  return `${slugifyPart(candidat.prenom)}.${slugifyPart(last)}@esp.mr`;
}

function needValidationForPiece(etat) {
  return etat === 'recu' || etat === 'en_verification';
}

function toutesLesPiecesRequisesConforme(d) {
  const p = d.pieces || {};
  for (const [k, etat] of Object.entries(p)) {
    if (!needValidationForPiece(etat)) continue;
    if (d.validationsParPiece?.[k]?.statut !== 'conforme') return false;
  }
  return true;
}

export const inscriptionDemandeService = {
  list: (filters = {}) => {
    let r = [...demandes];
    if (filters.q) r = r.filter((d) => matchQ(d, filters.q.trim().toLowerCase()));
    if (filters.departement) {
      r = r.filter(
        (d) =>
          d.candidat.filiere === filters.departement ||
          d.candidat.scolarite?.filiere === filters.departement,
      );
    }
    if (filters.annee) {
      r = r.filter((d) => d.candidat.scolarite?.niveau === filters.annee);
    }
    if (filters.type && filters.type !== 'tous') {
      r = r.filter((d) => d.type === filters.type);
    }
    if (filters.decision === 'en_attente') {
      r = r.filter((d) => d.decision === 'en_attente');
    }
    return mockDelay(r);
  },

  getAllSync: () => demandes,

  getById: (id) => demandes.find((x) => x.id === id) ?? null,

  setPieceValidation: (id, pieceKey, { statut, commentaire = '' }) => {
    const d = demandes.find((x) => x.id === id);
    if (!d) return { ok: false };
    d.validationsParPiece = d.validationsParPiece || {};
    d.validationsParPiece[pieceKey] = {
      statut,
      commentaire: commentaire?.trim() ?? '',
      date: new Date().toISOString(),
    };
    return { ok: true, demande: d };
  },

  accepter: async (id) => {
    const d = demandes.find((x) => x.id === id);
    if (!d) return mockDelay({ ok: false, error: 'Demande introuvable' });
    if (d.decision !== 'en_attente') return mockDelay({ ok: false, error: 'Déjà traitée' });
    if (!toutesLesPiecesRequisesConforme(d)) {
      return mockDelay({
        ok: false,
        error:
          'Chaque pièce reçue doit être contrôlée et marquée « Conforme » avant de créer le compte.',
        code: 'PIECES_INCOMPLETES',
      });
    }

    const c = d.candidat;
    const filiere = c.filiere || c.scolarite?.filiere;
    const matricule =
      c.matricule && String(c.matricule).trim() !== ''
        ? c.matricule
        : `ESP/26/${d.departementCode}/${String(Math.floor(100 + Math.random() * 899))}`;

    const emailProAttribue = d.type === 'nouvelle_inscription' ? genererEmailPro(c) : c.contact?.emailPro || genererEmailPro(c);

    const elevePayload = {
      matricule,
      nom: c.nom,
      prenom: c.prenom,
      nomAr: c.nomAr ?? '',
      nni: c.nni,
      numeroBac: c.numeroBac,
      dateNaissance: c.dateNaissance,
      lieuNaissance: c.lieuNaissance,
      nationalite: c.nationalite ?? '',
      categorieBac: c.categorieBac ?? '',
      serieBac: c.serieBac ?? '',
      ecoleBac: c.ecoleBac ?? '',
      residentAvecParents: c.residentAvecParents ?? '',
      compteBankily: c.compteBankily ?? '',
      sexe: c.sexe,
      filiere,
      section: '',
      compagnie: '',
      promotion: '',
      statut: 'actif',
      suspension: null,
      photoUrl: c.photoCandidat ?? `https://i.pravatar.cc/800?u=${encodeURIComponent(matricule)}`,
      sport: '',
      cycle: c.scolarite?.niveau ?? '',
      scolarite: {
        ...c.scolarite,
        filiere,
        departement: filiere,
      },
      parents: c.parents ?? {},
      contact: {
        telephone: c.contact?.telephone ?? '',
        tel2: c.contact?.tel2 ?? '',
        email: emailProAttribue,
        emailPro: emailProAttribue,
        emailPerso: c.contact?.emailPerso ?? '',
        adresse: c.contact?.adresse ?? '',
        adresseSecondaire: c.contact?.adresseSecondaire ?? '',
        parent: '',
        parentTel: '',
        telParent1Whatsapp: '',
        telParent2Appel: '',
      },
      sante: {
        groupeSanguin: 'O+',
        allergies: '',
        suivi: '',
        assureur: '',
        numeroAssure: '',
        antecedents: '',
        maladiesChroniques: '',
        medicaments: '',
        poids: '',
        tailleCm: '',
        imc: '',
      },
      habillement: {
        tailleChemise: 'M',
        taillePantalon: '',
        pointure: '',
      },
      hebergement: {
        batiment: 'Résidence 1',
        etage: '',
        aile: '',
        chambre: '',
        responsableChambre: false,
        responsableAile: false,
        responsableEtage: false,
      },
      pieces: {},
      dossier: [],
      relevesSemestres: [],
      absencesNonJustif: 0,
    };

    await eleveService.create(elevePayload);

    d.decision = 'acceptee';
    d.dateTraitement = new Date().toISOString();
    d.candidat.matricule = matricule;
    d.candidat.contact = { ...d.candidat.contact, emailPro: emailProAttribue };
    d.emailProAttribue = emailProAttribue;
    d.notificationsEnvoyees = [
      {
        canal: 'email',
        a: d.emailNotif,
        sujet: 'Inscription ESP — compte activé',
        detail: `Identifiant: ${emailProAttribue}`,
        envoyeLe: new Date().toISOString(),
      },
      {
        canal: 'whatsapp',
        a: d.whatsappNotif,
        envoyeLe: new Date().toISOString(),
      },
    ];

    return mockDelay({ ok: true, demande: d, matricule, emailPro: emailProAttribue });
  },

  refuser: async (id, { motif, message }) => {
    const d = demandes.find((x) => x.id === id);
    if (!d) return mockDelay({ ok: false, error: 'Demande introuvable' });
    if (d.decision !== 'en_attente') return mockDelay({ ok: false, error: 'Déjà traitée' });

    d.decision = 'refusee';
    d.dateTraitement = new Date().toISOString();
    d.motifRefus = motif;
    d.messageRefus = message;
    d.notificationsEnvoyees = [
      {
        canal: 'email',
        a: d.emailNotif,
        sujet: 'Réponse à votre demande d’inscription — ESP',
        corps: message,
        envoyeLe: new Date().toISOString(),
      },
      {
        canal: 'whatsapp',
        a: d.whatsappNotif,
        corps: message,
        envoyeLe: new Date().toISOString(),
      },
    ];

    return mockDelay({ ok: true, demande: d });
  },
};
