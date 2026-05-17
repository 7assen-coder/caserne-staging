import { useState } from 'react';
import {
  ArrowLeft,
  Download,
  FileEdit,
  FileText,
  GraduationCap,
  Heart,
  Home,
  IdCard,
  Phone,
  Plane,
  Shield,
  Users,
} from 'lucide-react';
import Button from '../common/Button';
import { initials } from '../../utils/formatters';

const DOCUMENTS_META = [
  { key: 'cin',                      label: 'CIN' },
  { key: 'acte_naissance',           label: 'Acte de naissance' },
  { key: 'diplome_acces',            label: "Diplôme d'accès" },
  { key: 'diplome_bac',              label: 'Diplôme du Bac' },
  { key: 'photo_identite_militaire', label: 'Photo identité militaire' },
  { key: 'photo_identite_civile',    label: 'Photo identité civile' },
  { key: 'photo_militaire_integrale',label: 'Photo militaire intégrale' },
];

function Section({ title, icon: Icon, children, className = '' }) {
  return (
    <section
      className={`flex flex-col overflow-hidden rounded-xl border border-light-gray bg-white shadow-sm ${className}`}
    >
      <h3 className="shrink-0 border-b border-light-gray px-4 py-3 text-sm font-semibold text-slate-900 sm:px-5">
        <span className="inline-flex items-center gap-2">
          {Icon && <Icon size={17} className="text-amber-500/90" strokeWidth={2} />}
          {title}
        </span>
      </h3>
      <div className="px-4 py-4 sm:px-5 sm:py-4">{children}</div>
    </section>
  );
}

function Item({ label, value, dir, className = '' }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-0.5 break-words text-sm text-slate-900" dir={dir}>
        {value ?? '—'}
      </p>
    </div>
  );
}

export default function EleveFicheView({ eleve, onBack, onEditDossier, loading = false }) {
  const [imgErr, setImgErr] = useState(false);
  const c = eleve;
  if (!c) return null;

  const s  = c.scolarite       ?? {};
  const sa = c.sante           ?? {};
  const dm = c.dossierMilitaire ?? {};
  const mo = c.mobilite        ?? {};
  const h  = c.hebergement     ?? {};
  const ct = c.contact         ?? {};
  const pa = c.parents         ?? {};

  const hasMobilite = Boolean(mo.type);

  const mensurations = [
    { label: 'Tour poitrine',    value: dm.tourPoitrine   ? `${dm.tourPoitrine} cm` : null },
    { label: 'Tour ceinture',    value: dm.tourCeinture   ? `${dm.tourCeinture} cm` : null },
    { label: 'Tour taille',      value: dm.tourTaille     ? `${dm.tourTaille} cm`   : null },
    { label: 'Tour bassin',      value: dm.tourBassin     ? `${dm.tourBassin} cm`   : null },
    { label: 'Tour cou',         value: dm.tourCou        ? `${dm.tourCou} cm`      : null },
    { label: 'Long. manche',     value: dm.longueurManche ? `${dm.longueurManche} cm` : null },
    { label: 'Long. dos',        value: dm.longueurDos    ? `${dm.longueurDos} cm`  : null },
    { label: 'Long. côté',       value: dm.longueurCote   ? `${dm.longueurCote} cm` : null },
    { label: 'Pointure',         value: dm.pointure       ? String(dm.pointure)     : null },
  ];
  const hasMensurations = mensurations.some((m) => m.value !== null);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── Header ── */}
      <div className="shrink-0 border-b border-light-gray bg-white px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button variant="secondary" size="sm" onClick={onBack} className="shrink-0">
              <ArrowLeft size={16} /> Retour à la liste
            </Button>
            <div className="h-6 w-px bg-light-gray" />
            <div className="min-w-0">
              <h1 className="truncate font-serif text-lg font-semibold text-slate-900 sm:text-xl">
                Fiche étudiant
              </h1>
              <p className="truncate text-xs text-slate-500 sm:text-sm">
                {c.prenom} {c.nom} · {c.matricule}
              </p>
              {loading && <p className="text-xs text-slate-400">Chargement des données complètes…</p>}
            </div>
          </div>
          <Button type="button" variant="primary" size="sm" icon={FileEdit} onClick={onEditDossier}>
            Modifier le dossier
          </Button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="w-full space-y-6 px-4 py-5 sm:px-6 lg:px-8">

          {/* ── Top grid: photo card + identité/scolarité ── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">

            {/* Photo card */}
            <div className="lg:col-span-4">
              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-light-gray bg-white ring-1 ring-slate-100">
                <div className="relative min-h-[280px] w-full flex-1 sm:min-h-[320px]">
                  {c.photoUrl && !imgErr ? (
                    <img
                      src={c.photoUrl}
                      alt={`${c.prenom} ${c.nom}`}
                      className="h-full w-full object-cover object-center"
                      onError={() => setImgErr(true)}
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full min-h-[280px] w-full flex-col items-center justify-center bg-gradient-to-b from-navy-900 to-navy p-6">
                      <div className="grid h-28 w-28 place-items-center rounded-2xl border border-white/20 bg-white/10 text-3xl font-serif font-semibold text-gold">
                        {initials(c.nom, c.prenom)}
                      </div>
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-black/10 to-transparent" />
                </div>
                <div className="shrink-0 space-y-3 border-t border-light-gray bg-off-white p-4">
                  <h2 className="text-center font-serif text-lg font-semibold text-slate-900">
                    {c.prenom} {c.nom}
                  </h2>
                  <p className="text-center font-mono text-base font-semibold tracking-widest text-slate-700">{c.matricule}</p>
                  <p className="text-center text-sm text-amber-800">{c.filiere}</p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {s.semestreActuel && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                        {s.semestreActuel}
                      </span>
                    )}
                    {c.section && (
                      <span className="rounded-full bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy">
                        {c.section}
                      </span>
                    )}
                    {c.compagnie && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {c.compagnie}
                      </span>
                    )}
                    {s.parcours && s.parcours !== 'En cours normal' && (
                      <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                        {s.parcours}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Identité + Scolarité */}
            <div className="grid min-h-0 content-start gap-6 lg:col-span-8">
              <Section title="Identité & parcours secondaire" icon={IdCard}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Item label="NNI"                      value={c.nni} />
                  <Item label="N° Bac"                   value={c.numeroBac} />
                  <Item label="Date de naissance"        value={c.dateNaissance} />
                  <Item label="Lieu de naissance"        value={c.lieuNaissance} />
                  <Item label="Nationalité"              value={c.nationalite} />
                  <Item label="Sexe"                     value={c.sexe === 'F' ? 'Féminin' : 'Masculin'} />
                  <Item label="Série Bac"                value={c.serieBac} />
                  <Item label="Catégorie Bac"            value={c.categorieBac} />
                  <Item label="École du Bac"             value={c.ecoleBac} />
                  <Item label="Résident chez les parents" value={c.residentAvecParents} />
                  <Item label="Compte Bankily"           value={c.compteBankily} />
                </div>
              </Section>

              <Section title="Scolarité" icon={GraduationCap}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Item label="Département"              value={c.filiere ?? s.filiere} />
                  <Item label="Niveau"                   value={s.niveau} />
                  <Item label="Semestre actuel"          value={s.semestreActuel} />
                  <Item label="Parcours"                 value={s.parcours} />
                  <Item label="Voie d'accès"             value={s.voieAcces} />
                  <Item label="1ʳᵉ année universitaire"  value={s.anneeUni1ere} />
                  <Item label="Diplôme d'accès"          value={s.diplomeAcces} />
                  <Item label="Établissement (1er cycle)" value={s.etablissementPremierCycle} />
                </div>
              </Section>
            </div>
          </div>

          {/* ── Famille + Contact ── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Section title="Famille" icon={Users}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Item label="Prénom père"        value={pa.prenomPere} />
                <Item label="Nom père"           value={pa.nomFamillePere} />
                <Item label="Fonction père"      value={pa.fonctionPere} />
                <Item label="Tél. père"          value={ct.telPere} />
                <Item label="Tél. père (WA)"     value={ct.telPereWhatsapp} />
                <Item label="Prénom mère"        value={pa.prenomMere} />
                <Item label="Nom mère"           value={pa.nomMere} />
                <Item label="Fonction mère"      value={pa.fonctionMere} />
                <Item label="Tél. mère"          value={ct.telMere} />
                <Item label="Tél. mère (WA)"     value={ct.telMereWhatsapp} />
                {ct.nomUrgence && (
                  <>
                    <Item label="Contact urgence"    value={ct.nomUrgence} className="sm:col-span-2" />
                    <Item label="Tél. urgence"       value={ct.telUrgence} />
                    <Item label="Tél. urgence (WA)"  value={ct.telUrgenceWhatsapp} />
                  </>
                )}
              </div>
            </Section>

            <Section title="Contact étudiant" icon={Phone}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Item label="Tél. 1"                value={ct.telephone} />
                <Item label="Tél. 2 (WhatsApp)"     value={ct.tel2} />
                <Item label="E-mail institutionnel"  value={ct.emailPro ?? ct.email} />
                <Item label="E-mail personnel"       value={ct.emailPerso} />
                <Item label="Adresse principale"     value={ct.adresse}           className="sm:col-span-2" />
                <Item label="Adresse secondaire"     value={ct.adresseSecondaire} className="sm:col-span-2" />
              </div>
            </Section>
          </div>

          {/* ── Santé + Dossier militaire ── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Section title="Santé" icon={Heart}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Item label="Groupe sanguin"       value={sa.groupeSanguin} />
                <Item label="IMC"                  value={sa.imc} />
                <Item label="Poids (kg)"           value={sa.poids} />
                <Item label="Taille (cm)"          value={sa.tailleCm} />
                <Item label="Assureur"             value={sa.assureur} />
                <Item label="N° assuré"            value={sa.numeroAssure} />
                <Item label="Antécédents médicaux" value={sa.antecedents}       className="sm:col-span-2" />
                <Item label="Maladies chroniques"  value={sa.maladiesChroniques} className="sm:col-span-2" />
                <Item label="Médicaments à vie"    value={sa.medicaments}        className="sm:col-span-2" />
              </div>
            </Section>

            <Section title="Dossier militaire" icon={Shield}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Item label="Compagnie"      value={dm.compagnie} />
                <Item label="Section"        value={dm.section} />
                <Item label="Sport pratiqué" value={dm.sportPratique} className="sm:col-span-2" />
              </div>
              {hasMensurations && (
                <>
                  <p className="mt-4 mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Mensurations
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {mensurations.map(({ label, value }) => (
                      <Item key={label} label={label} value={value} />
                    ))}
                  </div>
                </>
              )}
            </Section>
          </div>

          {/* ── Hébergement + Mobilité ── */}
          <div className={`grid grid-cols-1 gap-6 ${hasMobilite ? 'lg:grid-cols-2' : ''}`}>
            <Section title="Hébergement" icon={Home}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                <Item label="Bâtiment"  value={h.batiment} />
                <Item label="Étage"     value={h.etage} />
                <Item label="Aile"      value={h.aile} />
                <Item label="Chambre"   value={h.chambre} />
                <Item label="Lit"       value={h.lit} />
                {h.responsableChambre && <Item label="Rôle" value="Responsable chambre" />}
                {h.responsableAile    && <Item label="Rôle" value="Responsable aile" />}
                {h.responsableEtage   && <Item label="Rôle" value="Responsable étage" />}
              </div>
            </Section>

            {hasMobilite && (
              <Section title="Mobilité" icon={Plane}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Item label="Type"           value={mo.type} />
                  <Item label="Établissement"  value={mo.etablissement} />
                  <Item label="Spécialité"     value={mo.specialite} />
                  <Item label="Année de début" value={mo.anneeDebut} />
                  <Item label="Année de fin"   value={mo.anneeFin} />
                </div>
              </Section>
            )}
          </div>

          {/* ── Pièces justificatives ── */}
          <Section title="Pièces justificatives" icon={FileText}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {DOCUMENTS_META.map(({ key, label }) => {
                const url = c.documents?.[key];
                return url ? (
                  <a
                    key={key}
                    href={url}
                    download
                    className="flex items-center gap-2 rounded-lg border border-light-gray bg-off-white px-3 py-2.5 text-xs font-medium text-slate-700 transition hover:border-navy/30 hover:bg-white hover:text-navy"
                  >
                    <Download size={13} className="shrink-0 text-amber-500" aria-hidden />
                    {label}
                  </a>
                ) : (
                  <div
                    key={key}
                    className="flex items-center gap-2 rounded-lg border border-dashed border-light-gray/70 bg-slate-50/60 px-3 py-2.5 text-xs text-slate-400"
                    title="Fichier non fourni"
                  >
                    <FileText size={13} className="shrink-0" aria-hidden />
                    {label}
                  </div>
                );
              })}
            </div>
          </Section>

        </div>
      </div>
    </div>
  );
}
