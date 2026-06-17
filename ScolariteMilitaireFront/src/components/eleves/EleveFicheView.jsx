import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Download,
  FileDown,
  FileEdit,
  FileText,
  Ruler,
  Trash2,
} from 'lucide-react';
import Button from '../common/Button';
import { initials } from '../../utils/formatters';
import { buildEleveFicheSections } from '../../data/eleveFicheSections';
import { statutAcademiqueLabel } from '../../utils/eleveScolariteAuto';
import { downloadFicheMesureGp } from '../../utils/ficheMesureGpPdf';
import { formatDisplayText } from '../../utils/displayText';
import { downloadEleveDossierPdf } from '../../utils/eleveDossierPdf';
import { useToast } from '../../context/ToastContext';
import { humanizeError } from '../../utils/apiErrors';

const MENSURATION_LABELS = [
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

function Section({ title, icon: Icon, children, className = '', id }) {
  return (
    <section
      id={id}
      className={`flex flex-col overflow-hidden rounded-xl border border-light-gray bg-white shadow-sm ${className}`}
    >
      <h3 className="shrink-0 border-b border-light-gray px-4 py-3 text-sm font-semibold text-slate-900 sm:px-5">
        <span className="inline-flex items-center gap-2">
          {Icon && <Icon size={17} className="text-amber-500/90" strokeWidth={2} aria-hidden />}
          {title}
        </span>
      </h3>
      <div className="px-4 py-4 sm:px-5 sm:py-4">{children}</div>
    </section>
  );
}

function Item({ label, value, className = '' }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-0.5 break-words text-sm text-slate-900">{value ?? '—'}</p>
    </div>
  );
}

function FieldGrid({ fields, cols = 'sm:grid-cols-2' }) {
  return (
    <div className={`grid grid-cols-1 gap-3 ${cols}`}>
      {fields.map(({ label, value, wide }) => (
        <Item
          key={label}
          label={label}
          value={value}
          className={wide ? 'sm:col-span-2' : ''}
        />
      ))}
    </div>
  );
}

function DocumentsGrid({ documents, eleve }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {documents.map(({ key, label }) => {
        const url = eleve.documents?.[key];
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
  );
}

function sectionById(sections, id) {
  return sections.find((s) => s.id === id);
}

export default function EleveFicheView({ eleve, onBack, onEditDossier, onDelete, loading = false }) {
  const toast = useToast();
  const [imgErr, setImgErr] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(null);

  const sections = useMemo(() => (eleve ? buildEleveFicheSections(eleve) : []), [eleve]);

  if (!eleve) return null;

  const s = eleve.scolarite ?? {};
  const dm = eleve.dossierMilitaire ?? {};
  const statutLabel = statutAcademiqueLabel(eleve.statut ?? s.parcours);

  const identite = sectionById(sections, 'identite');
  const scolarite = sectionById(sections, 'scolarite');
  const contact = sectionById(sections, 'contact');
  const parents = sectionById(sections, 'parents');
  const sante = sectionById(sections, 'sante');
  const militaire = sectionById(sections, 'militaire');
  const hebergement = sectionById(sections, 'hebergement');
  const mobilite = sectionById(sections, 'mobilite');
  const pieces = sectionById(sections, 'pieces');

  const identiteFields = identite?.fields?.filter(
    (f) => !['Matricule', 'Nom', 'Prénom'].includes(f.label),
  ) ?? [];

  const militaireBase = militaire?.fields?.filter(
    (f) => !MENSURATION_LABELS.includes(f.label),
  ) ?? [];
  const mensurations = militaire?.fields?.filter(
    (f) => MENSURATION_LABELS.includes(f.label) && f.value != null && String(f.value).trim() !== '',
  ) ?? [];

  const scrollTo = (id) => {
    document.getElementById(`fiche-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleFicheMesure = async () => {
    try {
      setPdfBusy('mesure');
      await downloadFicheMesureGp({
        eleve,
        mensurations: dm,
        poids: eleve.sante?.poids,
        taille: eleve.sante?.tailleCm,
      });
      toast.success('Fiche mesure téléchargée.');
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setPdfBusy(null);
    }
  };

  const handleDossierPdf = async () => {
    try {
      setPdfBusy('dossier');
      await downloadEleveDossierPdf(eleve);
      toast.success('Dossier PDF téléchargé.');
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setPdfBusy(null);
    }
  };

  const navSections = sections.filter((sec) => !sec.isDocuments);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* En-tête */}
      <div className="shrink-0 border-b border-light-gray bg-white px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button variant="secondary" size="sm" onClick={onBack} className="shrink-0">
              <ArrowLeft size={16} aria-hidden /> Retour à la liste
            </Button>
            <div className="hidden h-6 w-px bg-light-gray sm:block" />
            <div className="min-w-0">
              <h1 className="truncate font-serif text-lg font-semibold text-slate-900 sm:text-xl">
                Fiche étudiant
              </h1>
              <p className="truncate text-xs text-slate-500 sm:text-sm">
                {eleve.prenom} {eleve.nom} · {eleve.matricule}
              </p>
              {loading && <p className="text-xs text-slate-400">Chargement des données complètes…</p>}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={!!pdfBusy} onClick={handleFicheMesure}>
              <Ruler size={15} aria-hidden />
              {pdfBusy === 'mesure' ? 'Génération…' : 'Fiche mesure'}
            </Button>
            <Button type="button" variant="secondary" size="sm" disabled={!!pdfBusy} onClick={handleDossierPdf}>
              <FileDown size={15} aria-hidden />
              {pdfBusy === 'dossier' ? 'Génération…' : 'Dossier PDF'}
            </Button>
            {onDelete ? (
              <Button type="button" variant="danger" size="sm" icon={Trash2} onClick={onDelete}>
                Supprimer
              </Button>
            ) : null}
            {onEditDossier ? (
              <Button type="button" variant="primary" size="sm" icon={FileEdit} onClick={onEditDossier}>
                Modifier le dossier
              </Button>
            ) : null}
          </div>
        </div>

        {/* Navigation horizontale compacte */}
        <nav
          className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Sections du dossier"
        >
          {navSections.map((sec) => {
            const Icon = sec.icon;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => scrollTo(sec.id)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-light-gray bg-off-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-navy/25 hover:bg-white hover:text-navy"
              >
                {Icon ? <Icon size={13} className="text-amber-500" aria-hidden /> : null}
                {sec.title}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Corps */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="w-full space-y-6 px-4 py-5 sm:px-6 lg:px-8">

          {/* Photo + Identité + Scolarité */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
            <div className="lg:col-span-4">
              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-light-gray bg-white ring-1 ring-slate-100">
                <div className="relative min-h-[280px] w-full flex-1 sm:min-h-[320px]">
                  {eleve.photoUrl && !imgErr ? (
                    <img
                      src={eleve.photoUrl}
                      alt={`${eleve.prenom} ${eleve.nom}`}
                      className="h-full w-full object-cover object-center"
                      onError={() => setImgErr(true)}
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full min-h-[280px] w-full flex-col items-center justify-center bg-gradient-to-b from-navy-900 to-navy p-6">
                      <div className="grid h-28 w-28 place-items-center rounded-2xl border border-white/20 bg-white/10 text-3xl font-serif font-semibold text-gold">
                        {initials(eleve.nom, eleve.prenom)}
                      </div>
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-black/10 to-transparent" />
                </div>
                <div className="shrink-0 space-y-3 border-t border-light-gray bg-off-white p-4">
                  <h2 className="text-center font-serif text-lg font-semibold text-slate-900">
                    {eleve.prenom} {eleve.nom}
                  </h2>
                  <p className="text-center font-mono text-base font-semibold tracking-widest text-slate-700">
                    {eleve.matricule}
                  </p>
                  <p className="text-center text-sm text-amber-800">{eleve.filiere ?? s.filiere}</p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {s.niveau && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                        {s.niveau}
                      </span>
                    )}
                    {(dm.section ?? eleve.section) && (
                      <span className="rounded-full bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy">
                        {formatDisplayText(dm.section ?? eleve.section)}
                      </span>
                    )}
                    {(dm.compagnie ?? eleve.compagnie) && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {formatDisplayText(dm.compagnie ?? eleve.compagnie)}
                      </span>
                    )}
                    {statutLabel !== 'Normal' && (
                      <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                        {statutLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid min-h-0 content-start gap-6 lg:col-span-8">
              {identite && (
                <Section id="fiche-identite" title="Identité & parcours secondaire" icon={identite.icon}>
                  <FieldGrid fields={identiteFields} />
                </Section>
              )}
              {scolarite && (
                <Section id="fiche-scolarite" title="Scolarité" icon={scolarite.icon}>
                  <FieldGrid fields={scolarite.fields} />
                </Section>
              )}
            </div>
          </div>

          {/* Famille + Contact */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {parents && (
              <Section id="fiche-parents" title="Famille" icon={parents.icon}>
                <FieldGrid fields={parents.fields} />
              </Section>
            )}
            {contact && (
              <Section id="fiche-contact" title="Informations de contact" icon={contact.icon}>
                <FieldGrid fields={contact.fields} />
              </Section>
            )}
          </div>

          {/* Santé + Militaire */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {sante && (
              <Section id="fiche-sante" title="Santé" icon={sante.icon}>
                <FieldGrid fields={sante.fields} />
              </Section>
            )}
            {militaire && (
              <Section id="fiche-militaire" title="Dossier militaire" icon={militaire.icon}>
                <FieldGrid fields={militaireBase} />
                {mensurations.length > 0 && (
                  <>
                    <p className="mt-4 mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Mensurations
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {mensurations.map(({ label, value }) => (
                        <Item key={label} label={label.replace(' (cm)', '')} value={value} />
                      ))}
                    </div>
                  </>
                )}
              </Section>
            )}
          </div>

          {/* Hébergement + Mobilité */}
          <div className={`grid grid-cols-1 gap-6 ${mobilite ? 'lg:grid-cols-2' : ''}`}>
            {hebergement && (
              <Section id="fiche-hebergement" title="Hébergement" icon={hebergement.icon}>
                <FieldGrid fields={hebergement.fields} cols="sm:grid-cols-2 md:grid-cols-4" />
              </Section>
            )}
            {mobilite && (
              <Section id="fiche-mobilite" title="Mobilité" icon={mobilite.icon}>
                <FieldGrid fields={mobilite.fields} />
              </Section>
            )}
          </div>

          {/* Pièces */}
          {pieces && (
            <Section id="fiche-pieces" title="Pièces & diplômes" icon={pieces.icon}>
              <DocumentsGrid documents={pieces.documents} eleve={eleve} />
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
