import {
  IdCard,
  GraduationCap,
  Phone,
  Heart,
  Shield,
  Home,
  Plane,
  FileText,
} from 'lucide-react';
import {
  isNiveauMobiliteEligible,
  statutAcademiqueLabel,
  normalizeSectionLabel,
} from '../utils/eleveScolariteAuto';
import { formatMoyenneFr } from '../utils/eleveFormValidation';
import { formatListFieldDisplay } from '../utils/listField';
import { computeIMC, classifyIMC, formatIMCWithClass } from '../utils/imc';

const VOIE_LABELS = {
  1: 'Voie 1 — Interne',
  2: 'Voie 1 — Externe',
  3: 'Voie 2 — Interne',
  4: 'Voie 2 — Externe',
};

/** Mensuration labelKeys (eleves.json). */
export const MENSURATION_KEYS = [
  'tourPoitrine',
  'tourCeinture',
  'tourTaille',
  'tourBassin',
  'tourCou',
  'longueurManche',
  'longueurDos',
  'longueurCote',
  'pointure',
];

/** @deprecated use MENSURATION_KEYS — kept for PDF FR labels */
export const MENSURATION_LABELS = [
  'Tour poitrine (cm)',
  'Tour ceinture (cm)',
  'Tour taille (cm)',
  'Tour bassin (cm)',
  'Tour cou (cm)',
  'Longueur manche (cm)',
  'Longueur dos (cm)',
  'Longueur côté (cm)',
  'Pointure',
];

function fmtDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('fr-FR');
}

function fmtSexe(s) {
  if (s === 'F') return 'F';
  if (s === 'M' || s === 'H') return 'M';
  return s;
}

function emailInstitutionnel(matricule) {
  const d = String(matricule ?? '').replace(/\D/g, '');
  return d ? `${d}@esp.mr` : null;
}

/**
 * @param {string} labelKey eleves.json key
 * @param {string} labelFr French label for PDF / fallback
 */
function field(labelKey, labelFr, value, opts = {}) {
  const empty =
    value == null
    || (typeof value === 'string' && value.trim() === '');
  return { labelKey, label: labelFr, value: empty ? null : value, ...opts };
}

/**
 * Sections ordered like the student creation form steps.
 */
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

  const communeNaissance =
    eleve.communeNaissanceLibre || eleve.communeNaissance || null;

  const identiteFields = [
    field('matricule', 'Matricule', eleve.matricule),
    field('nom', 'Nom', eleve.nom),
    field('prenom', 'Prénom', eleve.prenom),
    field('nni', 'NNI', eleve.nni),
    field('sexe', 'Sexe', fmtSexe(eleve.sexe)),
    field('dateNaissance', 'Date de naissance', fmtDate(eleve.dateNaissance)),
    field('lieuNaissance', 'Lieu de naissance', eleve.lieuNaissance),
  ];
  if (eleve.wilayaNaissance) {
    identiteFields.push(field('wilayaNaissance', 'Wilaya de naissance', eleve.wilayaNaissance));
  }
  if (communeNaissance) {
    identiteFields.push(field('communeNaissance', 'Commune de naissance', communeNaissance));
  }
  identiteFields.push(
    field('nationalite', 'Nationalité', eleve.nationalite),
    field('numeroBac', 'N° Bac', eleve.numeroBac),
    field('categorieBac', 'Catégorie Bac', eleve.categorieBac),
    field('serieBac', 'Série du Bac', eleve.serieBac),
    field('moyenneBac', 'Moyenne au Bac', formatMoyenneFr(eleve.moyenneBac) || eleve.moyenneBac),
    field('ecoleBac', 'École du Bac', eleve.ecoleBac),
  );

  const sections = [
    {
      id: 'identite',
      title: 'État civil',
      titleKey: 'stepEtatCivil',
      icon: IdCard,
      fields: identiteFields,
    },
    {
      id: 'scolarite',
      title: 'Scolarité',
      titleKey: 'scolarite',
      icon: GraduationCap,
      fields: [
        field('departement', 'Département', eleve.filiere ?? s.filiere ?? s.departement),
        field('niveauActuel', 'Niveau actuel', s.niveau),
        field('statutAcademique', 'Statut académique', statutLabel),
        field('semestreActuel', 'Semestre actuel', s.semestreActuel),
        field('anneeUni1ere', 'Année universitaire de 1re inscription', s.anneeUni1ere ?? eleve.anneePremiereInscription),
        field('datePremiereInscription', 'Date de 1re inscription', fmtDate(eleve.datePremiereInscription)),
        field('voieAcces', "Voie d'accès", VOIE_LABELS[s.voieAcces] ?? s.voieAcces),
        field('diplomeAcces', "Diplôme d'accès", s.diplomeAcces),
        field('etablissement', 'Établissement', s.etablissementPremierCycle),
        field('compagnie', 'Compagnie', dm.compagnie ?? eleve.compagnie),
        field('section', 'Section', normalizeSectionLabel(
          dm.section ?? eleve.section,
          dm.compagnie ?? eleve.compagnie,
        )),
      ],
    },
  ];

  if (isNiveauMobiliteEligible(s.niveau) || mo.type || mo.etablissement) {
    sections.push({
      id: 'mobilite',
      title: 'Mobilité',
      titleKey: 'stepMobilite',
      icon: Plane,
      fields: [
        field('typeMobilite', 'Type de mobilité', mo.type),
        field('etablissementAccueil', 'Établissement d’accueil', mo.etablissement),
        field('specialiteMobilite', 'Spécialité', mo.specialite),
        field('anneeUnivDebut', 'Année universitaire de début', mo.anneeDebut),
        field('anneeFin', 'Année de fin', mo.anneeFin),
        field('raisonMobilite', 'Raison', mo.raison, { wide: true }),
      ],
    });
  }

  sections.push(
    {
      id: 'pieces',
      title: 'Pièces',
      titleKey: 'stepPieces',
      icon: FileText,
      isDocuments: true,
      documents: [
        { key: 'photo_identite_civile', labelKey: 'photoIdentite', label: 'Photo d’identité' },
        { key: 'acte_naissance', labelKey: 'acteNaissance', label: 'Acte de naissance' },
        { key: 'diplome_acces', labelKey: 'diplomeAccesPiece', label: "Diplôme d'accès" },
        { key: 'diplome_bac', labelKey: 'diplomeBac', label: 'Diplôme du Bac' },
        { key: 'photo_identite_militaire', labelKey: 'photoIdentiteMilitaire', label: 'Photo identité militaire' },
        { key: 'photo_militaire_integrale', labelKey: 'photoMilitaireIntegrale', label: 'Photo militaire intégrale' },
        { key: 'cin', labelKey: 'cin', label: 'CIN' },
      ],
    },
    {
      id: 'contact',
      title: 'Informations de contact',
      titleKey: 'informationsContact',
      icon: Phone,
      fields: [
        field('adressePrimaire', 'Adresse primaire', ct.adresse),
        field('adresseSecondaire', 'Adresse secondaire', ct.adresseSecondaire),
        field('telephonePrincipal', 'Téléphone principal', ct.telephone),
        field('tel2Whatsapp', 'Tél. 2 (WhatsApp)', ct.tel2),
        field('emailPersonnel', 'E-mail personnel', ct.emailPerso),
        field('emailInstitutionnel', 'E-mail institutionnel', ct.emailPro ?? ct.email ?? emailInstitutionnel(eleve.matricule)),
        field('residentAvecParents', 'Résident avec les parents', eleve.residentAvecParents),
      ],
      parentsTitleKey: 'contactsParentsUrgence',
      parentsTitle: 'Contacts parents & personne à prévenir',
      parentsFields: [
        field('prenomPere', 'Prénom du père', pa.prenomPere),
        field('nomFamillePere', 'Nom de famille du père', pa.nomFamillePere),
        field('fonctionPere', 'Fonction / profession (père)', pa.fonctionPere),
        field('telPere', 'Tél. père', ct.telPere),
        field('telPereWhatsapp', 'Tél. père WhatsApp', ct.telPereWhatsapp),
        field('prenomMere', 'Prénom de la mère', pa.prenomMere),
        field('nomFamilleMere', 'Nom de famille de la mère', pa.nomMere),
        field('fonctionMere', 'Fonction / profession (mère)', pa.fonctionMere),
        field('telMere', 'Tél. mère', ct.telMere),
        field('telMereWhatsapp', 'Tél. mère WhatsApp', ct.telMereWhatsapp),
        field('nomUrgence', 'Nom personne à prévenir', ct.nomUrgence),
        field('telUrgence', 'Tél. urgence', ct.telUrgence),
        field('whatsappUrgence', 'WhatsApp urgence', ct.telUrgenceWhatsapp),
      ],
    },
    {
      id: 'sante',
      title: 'Santé',
      titleKey: 'stepSante',
      icon: Heart,
      fields: [
        field('groupeSanguin', 'Groupe sanguin', sa.groupeSanguin),
        field('poidsKg', 'Poids (kg)', sa.poids),
        field('tailleCm', 'Taille (cm)', sa.tailleCm),
        field(
          'imc',
          'IMC',
          (() => {
            const imcVal = sa.imc != null && sa.imc !== ''
              ? Number(String(sa.imc).replace(',', '.'))
              : computeIMC(sa.poids, sa.tailleCm);
            const n = Number.isFinite(imcVal) ? imcVal : computeIMC(sa.poids, sa.tailleCm);
            return formatIMCWithClass(n, classifyIMC(n)) || sa.imc || '';
          })(),
        ),
        field('assureur', 'Assureur', formatListFieldDisplay(sa.assureur)),
        field('numeroAssure', 'N° assuré', sa.numeroAssure),
        field('antecedents', 'Antécédents médicaux', formatListFieldDisplay(sa.antecedents), { wide: true }),
        field('maladiesChroniques', 'Maladies chroniques', formatListFieldDisplay(sa.maladiesChroniques), { wide: true }),
        field('medicamentsAVie', 'Médicaments à vie', formatListFieldDisplay(sa.medicaments), { wide: true }),
      ],
    },
    {
      id: 'militaire',
      title: 'Dossier militaire',
      titleKey: 'dossierMilitaire',
      icon: Shield,
      fields: [
        field('compagnie', 'Compagnie', dm.compagnie),
        field('section', 'Section', normalizeSectionLabel(dm.section, dm.compagnie)),
        field('compteBankily', 'Compte Bankily', eleve.compteBankily),
        field('sportPratique', 'Sport pratiqué', formatListFieldDisplay(dm.sportPratique), { wide: true }),
        field('tourPoitrine', 'Tour poitrine (cm)', dm.tourPoitrine),
        field('tourCeinture', 'Tour ceinture (cm)', dm.tourCeinture),
        field('tourTaille', 'Tour taille (cm)', dm.tourTaille),
        field('tourBassin', 'Tour bassin (cm)', dm.tourBassin),
        field('tourCou', 'Tour cou (cm)', dm.tourCou),
        field('longueurManche', 'Longueur manche (cm)', dm.longueurManche),
        field('longueurDos', 'Longueur dos (cm)', dm.longueurDos),
        field('longueurCote', 'Longueur côté (cm)', dm.longueurCote),
        field('pointure', 'Pointure', dm.pointure),
      ],
    },
    {
      id: 'hebergement',
      title: 'Hébergement',
      titleKey: 'hebergement',
      icon: Home,
      fields: [
        field('batiment', 'Bâtiment', h.batiment),
        field('etage', 'Étage', h.etage),
        field('aile', 'Aile', h.aile),
        field('chambre', 'Chambre', h.chambre),
        field('lit', 'Lit', h.lit),
        field('responsableChambre', 'Responsable chambre', h.responsableChambre ? 'Oui' : h.responsableChambre === false ? 'Non' : null),
        field('responsableAile', 'Responsable aile', h.responsableAile ? 'Oui' : h.responsableAile === false ? 'Non' : null),
        field('responsableEtage', 'Responsable étage', h.responsableEtage ? 'Oui' : h.responsableEtage === false ? 'Non' : null),
      ],
    },
  );

  return sections;
}
