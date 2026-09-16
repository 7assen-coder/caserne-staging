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
import { useTranslation } from 'react-i18next';
import Button from '../common/Button';
import { initials } from '../../utils/formatters';
import {
  buildEleveFicheSections,
  MENSURATION_KEYS,
} from '../../data/eleveFicheSections';
import { statutAcademiqueLabel } from '../../utils/eleveScolariteAuto';
import { downloadFicheMesureGp } from '../../utils/ficheMesureGpPdf';
import { formatDisplayText } from '../../utils/displayText';
import { downloadEleveDossierPdf } from '../../utils/eleveDossierPdf';
import { useToast } from '../../context/ToastContext';
import { humanizeError } from '../../utils/apiErrors';

function displayFicheValue(value, emptyMarker, t) {
  if (value == null) return emptyMarker;
  const s = String(value).trim();
  if (s === '') return emptyMarker;
  if (s === 'Oui') return t('oui');
  if (s === 'Non') return t('non');
  return s;
}

function fieldLabel(field, t) {
  if (field?.labelKey) return t(field.labelKey);
  return field?.label ?? '';
}

function Section({ title, icon: Icon, children, className = '', id }) {
  return (
    <section
      id={id}
      className={`flex min-w-0 flex-col overflow-hidden rounded-xl border border-light-gray bg-white ${className}`}
    >
      <h3 className="shrink-0 border-b border-light-gray bg-slate-50/80 px-4 py-2.5 text-sm font-semibold text-slate-900 sm:px-5">
        <span className="inline-flex items-center gap-2">
          {Icon && <Icon size={16} className="text-amber-600" strokeWidth={2} aria-hidden />}
          {title}
        </span>
      </h3>
      <div className="px-4 py-3 sm:px-5 sm:py-3.5">{children}</div>
    </section>
  );
}

function Item({ label, value, emptyMarker, t, className = '' }) {
  const display = displayFicheValue(value, emptyMarker, t);
  const isEmpty = display === emptyMarker;
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500 sm:text-sm">{label}</p>
      <p
        className={`mt-1 break-words text-base leading-snug ${
          isEmpty ? 'font-normal text-slate-400' : 'font-semibold text-slate-900'
        }`}
      >
        {display}
      </p>
    </div>
  );
}

function FieldGrid({ fields, emptyMarker, t, cols = 'sm:grid-cols-2' }) {
  return (
    <div className={`grid grid-cols-1 gap-x-4 gap-y-3 ${cols}`}>
      {fields.map((f) => (
        <Item
          key={f.labelKey || f.label}
          label={fieldLabel(f, t)}
          value={f.value}
          emptyMarker={emptyMarker}
          t={t}
          className={f.wide ? 'sm:col-span-2' : ''}
        />
      ))}
    </div>
  );
}

function DocumentsGrid({ documents, eleve, emptyMarker, t }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {documents.map((doc) => {
        const url = eleve.documents?.[doc.key];
        const label = doc.labelKey ? t(doc.labelKey) : doc.label;
        return url ? (
          <a
            key={doc.key}
            href={url}
            download
            className="flex min-w-0 items-center gap-2 rounded-lg border border-light-gray bg-off-white px-3 py-2.5 text-xs font-medium text-slate-700 transition hover:border-navy/30 hover:bg-white hover:text-navy"
          >
            <Download size={13} className="shrink-0 text-amber-500" aria-hidden />
            <span className="min-w-0 truncate">{label}</span>
          </a>
        ) : (
          <div
            key={doc.key}
            className="flex min-w-0 items-center gap-2 rounded-lg border border-dashed border-light-gray/70 bg-slate-50/60 px-3 py-2.5 text-xs text-slate-400"
            title={emptyMarker}
          >
            <FileText size={13} className="shrink-0" aria-hidden />
            <span className="min-w-0 truncate">{label}</span>
            <span className="ms-auto shrink-0">{emptyMarker}</span>
          </div>
        );
      })}
    </div>
  );
}

function sectionById(sections, id) {
  return sections.find((s) => s.id === id);
}

function sectionTitle(sec, t) {
  if (!sec) return '';
  return sec.titleKey ? t(sec.titleKey) : sec.title;
}

export default function EleveFicheView({ eleve, onBack, onEditDossier, onDelete, loading = false }) {
  const toast = useToast();
  const { t, i18n } = useTranslation(['eleves', 'common']);
  const emptyMarker = t('common:emptyField');
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
  const sante = sectionById(sections, 'sante');
  const militaire = sectionById(sections, 'militaire');
  const hebergement = sectionById(sections, 'hebergement');
  const mobilite = sectionById(sections, 'mobilite');
  const pieces = sectionById(sections, 'pieces');

  const identiteFields = identite?.fields?.filter(
    (f) => !['matricule', 'nom', 'prenom'].includes(f.labelKey),
  ) ?? [];

  const militaireBase = militaire?.fields?.filter(
    (f) => !MENSURATION_KEYS.includes(f.labelKey),
  ) ?? [];
  const mensurations = militaire?.fields?.filter(
    (f) => MENSURATION_KEYS.includes(f.labelKey),
  ) ?? [];

  const handleFicheMesure = async () => {
    try {
      setPdfBusy('mesure');
      await downloadFicheMesureGp({
        eleve,
        mensurations: dm,
        poids: eleve.sante?.poids,
        taille: eleve.sante?.tailleCm,
      });
      toast.success(i18n.language === 'ar' ? 'تم تنزيل ورقة القياسات.' : 'Fiche mesure téléchargée.');
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
      toast.success(i18n.language === 'ar' ? 'تم تنزيل ملف PDF.' : 'Dossier PDF téléchargé.');
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setPdfBusy(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-light-gray bg-white px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <Button variant="secondary" size="sm" onClick={onBack} className="shrink-0">
              <ArrowLeft size={16} aria-hidden />{' '}
              {onEditDossier || onDelete ? t('retourListe') : t('retour')}
            </Button>
            <div className="hidden h-5 w-px bg-light-gray sm:block" />
            <div className="min-w-0">
              <h1 className="truncate font-serif text-base font-semibold text-slate-900 sm:text-lg">
                {t('ficheEtudiant')}
              </h1>
              <p className="truncate text-xs text-slate-500">
                {eleve.prenom} {eleve.nom} · {eleve.matricule}
              </p>
              {loading && <p className="text-xs text-slate-400">{t('chargementDonnees')}</p>}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={!!pdfBusy} onClick={handleFicheMesure}>
              <Ruler size={15} aria-hidden />
              {pdfBusy === 'mesure' ? t('generationEnCours') : t('ficheMesureBtn')}
            </Button>
            <Button type="button" variant="secondary" size="sm" disabled={!!pdfBusy} onClick={handleDossierPdf}>
              <FileDown size={15} aria-hidden />
              {pdfBusy === 'dossier' ? t('generationEnCours') : t('dossierPdf')}
            </Button>
            {onDelete ? (
              <Button type="button" variant="danger" size="sm" icon={Trash2} onClick={onDelete}>
                {t('supprimer')}
              </Button>
            ) : null}
            {onEditDossier ? (
              <Button type="button" variant="primary" size="sm" icon={FileEdit} onClick={onEditDossier}>
                {t('modifierDossier')}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl space-y-3 px-4 py-3 sm:space-y-4 sm:px-6 sm:py-4 lg:px-8">
          {/* Compact identity strip — no tall void column */}
          <div className="overflow-hidden rounded-xl border border-light-gray bg-white shadow-sm">
            <div className="flex flex-col sm:flex-row">
              <div className="relative h-56 w-full shrink-0 bg-navy sm:min-h-[14rem] sm:w-56 md:w-72">
                {eleve.photoUrl && !imgErr ? (
                  <img
                    src={eleve.photoUrl}
                    alt={`${eleve.prenom} ${eleve.nom}`}
                    className="absolute inset-0 h-full w-full object-cover object-center"
                    onError={() => setImgErr(true)}
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full min-h-[14rem] w-full items-center justify-center bg-gradient-to-br from-navy-900 to-navy">
                    <div className="grid h-24 w-24 place-items-center rounded-xl border border-white/20 bg-white/10 text-3xl font-serif font-semibold text-gold">
                      {initials(eleve.nom, eleve.prenom)}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 border-t border-light-gray px-4 py-3 sm:border-s sm:border-t-0 sm:px-5 sm:py-4">
                <div>
                  <h2 className="font-serif text-lg font-semibold leading-tight text-slate-900 sm:text-xl">
                    {eleve.prenom} {eleve.nom}
                  </h2>
                  {(eleve.prenomAr || eleve.nomAr) ? (
                    <p
                      className="mt-0.5 inline-block max-w-full text-start text-sm text-slate-600"
                      dir="rtl"
                      lang="ar"
                    >
                      {[eleve.prenomAr, eleve.nomAr].filter(Boolean).join(' ')}
                    </p>
                  ) : null}
                </div>
                <p className="text-sm text-slate-700">
                  <span className="font-mono font-semibold tracking-wider">{eleve.matricule}</span>
                  {(eleve.filiere ?? s.filiere) ? (
                    <>
                      <span className="mx-1.5 text-slate-300" aria-hidden>·</span>
                      <span className="font-medium text-amber-800">{eleve.filiere ?? s.filiere}</span>
                    </>
                  ) : null}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {eleve.profilIncomplet ? (
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-amber-100">
                      {t('dossierACompleter')}
                    </span>
                  ) : null}
                  {s.niveau ? (
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-100">
                      {s.niveau}
                    </span>
                  ) : null}
                  {(dm.section ?? eleve.section) ? (
                    <span className="rounded-md bg-navy-50 px-2 py-0.5 text-[11px] font-medium text-navy ring-1 ring-navy/10">
                      {formatDisplayText(dm.section ?? eleve.section)}
                    </span>
                  ) : null}
                  {(dm.compagnie ?? eleve.compagnie) ? (
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200/80">
                      {formatDisplayText(dm.compagnie ?? eleve.compagnie)}
                    </span>
                  ) : null}
                  {statutLabel !== 'Normal' ? (
                    <span className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-red-100">
                      {statutLabel}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Dense section grid — fills width, no empty photo column */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {identite ? (
              <Section id="fiche-identite" title={sectionTitle(identite, t)} icon={identite.icon}>
                <FieldGrid fields={identiteFields} emptyMarker={emptyMarker} t={t} />
              </Section>
            ) : null}

            {scolarite ? (
              <Section id="fiche-scolarite" title={sectionTitle(scolarite, t)} icon={scolarite.icon}>
                <FieldGrid fields={scolarite.fields} emptyMarker={emptyMarker} t={t} />
              </Section>
            ) : null}

            {mobilite ? (
              <Section id="fiche-mobilite" title={sectionTitle(mobilite, t)} icon={mobilite.icon}>
                <FieldGrid fields={mobilite.fields} emptyMarker={emptyMarker} t={t} />
              </Section>
            ) : null}

            {pieces ? (
              <Section
                id="fiche-pieces"
                title={sectionTitle(pieces, t)}
                icon={pieces.icon}
                className={mobilite ? '' : 'lg:col-span-2'}
              >
                <DocumentsGrid documents={pieces.documents} eleve={eleve} emptyMarker={emptyMarker} t={t} />
              </Section>
            ) : null}

            {contact ? (
              <Section id="fiche-contact" title={sectionTitle(contact, t)} icon={contact.icon} className="lg:col-span-2">
                <FieldGrid fields={contact.fields} emptyMarker={emptyMarker} t={t} cols="sm:grid-cols-2 lg:grid-cols-3" />
                {contact.parentsFields?.length ? (
                  <>
                    <h4 className="mt-4 mb-2 border-t border-light-gray pt-3 text-sm font-semibold text-slate-700">
                      {contact.parentsTitleKey ? t(contact.parentsTitleKey) : contact.parentsTitle}
                    </h4>
                    <FieldGrid
                      fields={contact.parentsFields}
                      emptyMarker={emptyMarker}
                      t={t}
                      cols="sm:grid-cols-2 lg:grid-cols-3"
                    />
                  </>
                ) : null}
              </Section>
            ) : null}

            {sante ? (
              <Section id="fiche-sante" title={sectionTitle(sante, t)} icon={sante.icon}>
                <FieldGrid fields={sante.fields} emptyMarker={emptyMarker} t={t} />
              </Section>
            ) : null}

            {militaire ? (
              <Section id="fiche-militaire" title={sectionTitle(militaire, t)} icon={militaire.icon}>
                <FieldGrid fields={militaireBase} emptyMarker={emptyMarker} t={t} />
                <p className="mt-3 mb-2 text-sm font-semibold text-slate-600">{t('mensurations')}</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {mensurations.map((f) => (
                    <Item
                      key={f.labelKey}
                      label={fieldLabel(f, t)}
                      value={f.value}
                      emptyMarker={emptyMarker}
                      t={t}
                    />
                  ))}
                </div>
              </Section>
            ) : null}

            {hebergement ? (
              <Section id="fiche-hebergement" title={sectionTitle(hebergement, t)} icon={hebergement.icon} className="lg:col-span-2">
                <FieldGrid
                  fields={hebergement.fields}
                  emptyMarker={emptyMarker}
                  t={t}
                  cols="sm:grid-cols-2 md:grid-cols-4"
                />
              </Section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
