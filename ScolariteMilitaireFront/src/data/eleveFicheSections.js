import {
  IdCard,
  GraduationCap,
  Phone,
  Users,
  Heart,
  Shield,
  Home,
  Plane,
  FileText,
} from 'lucide-react';
import {
  isNiveauMobiliteEligible,
  statutAcademiqueLabel,
} from '../utils/eleveScolariteAuto';

const VOIE_LABELS = {
  1: 'Voie 1 — Interne',
  2: 'Voie 1 — Externe',
  3: 'Voie 2 — Interne',
  4: 'Voie 2 — Externe',
};

function fmtDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('fr-FR');
}

function fmtSexe(s) {
  if (s === 'F') return 'Féminin';
  if (s === 'M') return 'Masculin';
  return s;
}

function emailInstitutionnel(matricule) {
  const d = String(matricule ?? '').replace(/\D/g, '');
  return d ? `${d}@esp.mr` : null;
}

function field(label, value, opts = {}) {
  return { label, value: value ?? null, ...opts };
}

/** Sections ordonnées comme le formulaire de création (4.17). */
export function buildEleveFicheSections(eleve) {
  if (!eleve) return [];

  const s = eleve.scolarite ?? {};
  const sa = eleve.sante ?? {};
  const dm = eleve.dossierMilitaire ?? {};
  const mo = eleve.mobilite ?? {};
  const h = eleve.hebergement ?? {};
  const ct = eleve.contact ?? {};
  const pa = eleve.parents ?? {};
  const statutLabel = statutAcademiqueLabel(eleve.statut ?? s.parcours);

  const sections = [
    {
      id: 'identite',
      title: 'État civil',
      icon: IdCard,
      fields: [
        field('Matricule', eleve.matricule),
        field('Nom', eleve.nom),
        field('Prénom', eleve.prenom),
        field('NNI', eleve.nni),
        field('Sexe', fmtSexe(eleve.sexe)),
        field('Date de naissance', fmtDate(eleve.dateNaissance)),
        field('Lieu de naissance', eleve.lieuNaissance),
        field('Nationalité', eleve.nationalite),
        field('N° Bac', eleve.numeroBac),
        field('Catégorie Bac', eleve.categorieBac),
        field('Série du Bac', eleve.serieBac),
        field('Moyenne au Bac', eleve.moyenneBac),
        field('École du Bac', eleve.ecoleBac),
      ],
    },
    {
      id: 'scolarite',
      title: 'Scolarité',
      icon: GraduationCap,
      fields: [
        field('Département', eleve.filiere ?? s.filiere ?? s.departement),
        field('Niveau actuel', s.niveau),
        field('Statut académique', statutLabel),
        field('Semestre actuel', s.semestreActuel),
        field('Année universitaire de 1ʳᵉ inscription', s.anneeUni1ere ?? eleve.anneePremiereInscription),
        field('Date de 1ʳᵉ inscription', fmtDate(eleve.datePremiereInscription)),
        field("Voie d'accès", VOIE_LABELS[s.voieAcces] ?? s.voieAcces),
        field("Diplôme d'accès", s.diplomeAcces),
        field('Établissement (diplôme d’accès)', s.etablissementPremierCycle),
        field('Compagnie', dm.compagnie ?? eleve.compagnie),
        field('Section', dm.section ?? eleve.section),
      ],
    },
    {
      id: 'contact',
      title: 'Informations de contact',
      icon: Phone,
      fields: [
        field('Adresse primaire', ct.adresse),
        field('Adresse secondaire', ct.adresseSecondaire),
        field('Téléphone principal', ct.telephone),
        field('Tél. 2 (WhatsApp)', ct.tel2),
        field('E-mail personnel', ct.emailPerso),
        field('E-mail institutionnel', ct.emailPro ?? ct.email ?? emailInstitutionnel(eleve.matricule)),
        field('Résident avec les parents', eleve.residentAvecParents),
        field('Compte Bankily', eleve.compteBankily),
      ],
    },
    {
      id: 'parents',
      title: 'Contacts parents & urgence',
      icon: Users,
      fields: [
        field('Prénom du père', pa.prenomPere),
        field('Nom de famille du père', pa.nomFamillePere),
        field('Fonction / profession (père)', pa.fonctionPere),
        field('Tél. père', ct.telPere),
        field('Tél. père WhatsApp', ct.telPereWhatsapp),
        field('Prénom de la mère', pa.prenomMere),
        field('Nom de famille de la mère', pa.nomMere),
        field('Fonction / profession (mère)', pa.fonctionMere),
        field('Tél. mère', ct.telMere),
        field('Tél. mère WhatsApp', ct.telMereWhatsapp),
        field('Nom personne à prévenir', ct.nomUrgence),
        field('Tél. urgence', ct.telUrgence),
        field('WhatsApp urgence', ct.telUrgenceWhatsapp),
      ],
    },
    {
      id: 'sante',
      title: 'Santé',
      icon: Heart,
      fields: [
        field('Groupe sanguin', sa.groupeSanguin),
        field('Poids (kg)', sa.poids),
        field('Taille (cm)', sa.tailleCm),
        field('IMC', sa.imc),
        field('Assureur', sa.assureur),
        field('N° assuré', sa.numeroAssure),
        field('Antécédents médicaux', sa.antecedents, { wide: true }),
        field('Maladies chroniques', sa.maladiesChroniques, { wide: true }),
        field('Médicaments à vie', sa.medicaments, { wide: true }),
      ],
    },
    {
      id: 'militaire',
      title: 'Dossier militaire',
      icon: Shield,
      fields: [
        field('Compagnie', dm.compagnie),
        field('Section', dm.section),
        field('Sport pratiqué', dm.sportPratique, { wide: true }),
        field('Tour poitrine (cm)', dm.tourPoitrine),
        field('Tour ceinture (cm)', dm.tourCeinture),
        field('Tour taille (cm)', dm.tourTaille),
        field('Tour bassin (cm)', dm.tourBassin),
        field('Tour cou (cm)', dm.tourCou),
        field('Longueur manche (cm)', dm.longueurManche),
        field('Longueur dos (cm)', dm.longueurDos),
        field('Longueur côté (cm)', dm.longueurCote),
        field('Pointure', dm.pointure),
      ],
    },
    {
      id: 'hebergement',
      title: 'Hébergement',
      icon: Home,
      fields: [
        field('Bâtiment', h.batiment),
        field('Étage', h.etage),
        field('Aile', h.aile),
        field('Chambre', h.chambre),
        field('Lit', h.lit),
        field('Responsable chambre', h.responsableChambre ? 'Oui' : h.responsableChambre === false ? 'Non' : null),
        field('Responsable aile', h.responsableAile ? 'Oui' : h.responsableAile === false ? 'Non' : null),
        field('Responsable étage', h.responsableEtage ? 'Oui' : h.responsableEtage === false ? 'Non' : null),
      ],
    },
  ];

  if (isNiveauMobiliteEligible(s.niveau) || mo.type || mo.etablissement) {
    sections.push({
      id: 'mobilite',
      title: 'Mobilité',
      icon: Plane,
      fields: [
        field('Type de mobilité', mo.type),
        field('Établissement d’accueil', mo.etablissement),
        field('Spécialité', mo.specialite),
        field('Année universitaire de début', mo.anneeDebut),
        field('Année de fin', mo.anneeFin),
      ],
    });
  }

  sections.push({
    id: 'pieces',
    title: 'Pièces & diplômes',
    icon: FileText,
    isDocuments: true,
    documents: [
      { key: 'photo_identite', label: 'Photo d’identité' },
      { key: 'acte_naissance', label: 'Acte de naissance' },
      { key: 'diplome_acces', label: "Diplôme d'accès" },
      { key: 'diplome_bac', label: 'Diplôme du Bac' },
      { key: 'photo_identite_militaire', label: 'Photo identité militaire' },
      { key: 'photo_identite_civile', label: 'Photo identité civile' },
      { key: 'photo_militaire_integrale', label: 'Photo militaire intégrale' },
      { key: 'cin', label: 'CIN' },
    ],
  });

  return sections;
}
