import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Mail,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  MinusCircle,
  User,
  GraduationCap,
  Users,
  FileStack,
  FileText,
  Calendar,
  X,
  Maximize2,
} from 'lucide-react';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { initials } from '../../utils/formatters';
import { inscriptionDemandeService } from '../../services/inscriptionDemandeService';

function Section({ title, icon: Icon, children, className = '', bodyClass = '' }) {
  return (
    <section
      className={`flex h-full min-h-0 flex-col rounded-xl border border-light-gray bg-white shadow-sm ${className}`}
    >
      <h4 className="shrink-0 border-b border-light-gray px-4 py-3.5 text-sm font-semibold text-slate-900 sm:px-5">
        <span className="inline-flex items-center gap-2">
          {Icon && <Icon size={17} className="text-amber-500/90" strokeWidth={2} />}
          {title}
        </span>
      </h4>
      <div className={`min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-5 sm:py-4 ${bodyClass}`}>
        {children}
      </div>
    </section>
  );
}

function InfoItem({ label, value, dir }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-0.5 break-words text-sm text-slate-900" dir={dir}>
        {value ?? '—'}
      </p>
    </div>
  );
}

const PIECE_LABELS = {
  carteIdentite: 'Carte d’identité',
  releveBac: 'Relevé de notes (Bac)',
  releveNotesSemestres: 'Relevé de notes (S1–S5)',
  diplomeBac: 'Diplôme / attestation Bac',
};

function pieceLabel(k) {
  return PIECE_LABELS[k] ?? k;
}

function etatLecture(etat) {
  if (etat === 'recu')
    return { label: 'Fichier reçu', tone: 'text-emerald-400', Icon: CheckCircle2 };
  if (etat === 'manquant')
    return { label: 'Manquant côté candidat', tone: 'text-amber-400', Icon: AlertCircle };
  if (etat === 'en_verification')
    return { label: 'En cours de vérification', tone: 'text-sky-400', Icon: MinusCircle };
  if (etat === 'non_applicable')
    return { label: 'Non requis (profil neuf)', tone: 'text-slate-500', Icon: MinusCircle };
  return { label: String(etat), tone: 'text-slate-500', Icon: MinusCircle };
}

function needControl(etat) {
  return etat === 'recu' || etat === 'en_verification';
}

function formatDt(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function isPdfFichier(fichier) {
  if (!fichier) return false;
  if (fichier.type === 'pdf') return true;
  return String(fichier.nom || '').toLowerCase().endsWith('.pdf');
}

/**
 * Aperçu plein écran (image ou PDF) — « Aperçu » sur la ligne de la pièce.
 */
function ApercuPieceModal({ open, onClose, fichier, label }) {
  if (!open || !fichier?.apercuUrl) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/25 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal
      aria-label={`Aperçu — ${label}`}
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[min(92vh,1200px)] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-light-gray bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-light-gray px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{label}</p>
            {fichier.nom && (
              <p className="mt-0.5 truncate font-mono text-xs text-slate-500">
                {fichier.nom} {fichier.taille ? `· ${fichier.taille}` : ''}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-light-gray text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-white p-2 sm:p-4">
          {isPdfFichier(fichier) && /\.pdf(\?|$)/i.test(fichier.apercuUrl) ? (
            <iframe
              title={label}
              src={fichier.apercuUrl}
              className="h-[min(78vh,900px)] w-full rounded-lg border border-light-gray bg-white"
            />
          ) : (
            <img
              src={fichier.apercuUrl}
              alt={label}
              className="mx-auto max-h-[min(78vh,900px)] w-full max-w-full object-contain"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function CandidatPortrait({ candidat, typeLabel, demande }) {
  const [imgErr, setImgErr] = useState(false);
  const url = candidat.photoCandidat;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-light-gray bg-white ring-1 ring-slate-100">
      <div className="relative w-full flex-1 min-h-[280px] sm:min-h-[360px] lg:min-h-0">
        {url && !imgErr ? (
          <img
            src={url}
            alt={`Photo — ${candidat.prenom} ${candidat.nom}`}
            className="h-full w-full object-cover object-center"
            onError={() => setImgErr(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full min-h-[280px] w-full flex-col items-center justify-center bg-gradient-to-b from-navy-900 to-navy p-6">
            <div className="grid h-28 w-28 place-items-center rounded-2xl border border-white/20 bg-white/10 text-3xl font-serif font-semibold text-gold">
              {initials(candidat.nom, candidat.prenom)}
            </div>
            <p className="mt-3 text-center text-xs text-white/75">Photo d’identité (démo)</p>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-black/10 to-transparent" />
      </div>
      <div className="shrink-0 space-y-3 border-t border-light-gray bg-off-white p-4">
        <h3 className="text-center font-serif text-lg font-semibold leading-tight text-slate-900">
          {candidat.prenom} {candidat.nom}
        </h3>
        <p className="text-center font-mono text-[11px] text-slate-500">
          {candidat.matricule && String(candidat.matricule).trim() !== '' ? candidat.matricule : 'Matricule — à créer'}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <span className="chip border-amber-200 bg-amber-50 text-[10px] text-amber-900">{typeLabel}</span>
          {demande.decision === 'acceptee' && <Badge tone="valide">Compte créé</Badge>}
          {demande.decision === 'refusee' && <Badge tone="refuse">Refusée</Badge>}
          {demande.decision === 'en_attente' && <Badge tone="en_attente">À traiter</Badge>}
        </div>
        <div className="space-y-1.5 border-t border-light-gray pt-3 text-left text-xs text-text-light">
          <p>
            <span className="text-slate-500">App :</span> {demande.appMobile.plateforme} v{demande.appMobile.version}
          </p>
          <p className="flex items-center gap-1.5">
            <Calendar size={12} className="shrink-0" />
            {formatDt(demande.dateSoumission)}
          </p>
        </div>
        <div className="space-y-1.5 border-t border-light-gray pt-3 text-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Contact notification</p>
          <p className="flex items-center gap-1.5 break-all text-slate-700">
            <Mail size={12} className="shrink-0 text-amber-500/80" />
            {demande.emailNotif}
          </p>
          <p className="flex items-center gap-1.5 text-slate-700">
            <MessageCircle size={12} className="shrink-0 text-amber-500/80" />
            {demande.whatsappNotif}
          </p>
        </div>
      </div>
    </div>
  );
}

function PieceControleBlock({ demande, pieceKey, etat, fichier, onUpdated, onOpenApercu }) {
  const [commentaire, setCommentaire] = useState(
    () => demande.validationsParPiece?.[pieceKey]?.commentaire ?? '',
  );
  const [saving, setSaving] = useState(false);
  const v = demande.validationsParPiece?.[pieceKey];
  const { label: etatFichierLabel, tone, Icon: EtatIcon } = etatLecture(etat);
  const ctrl = needControl(etat);
  const apercuDispo = Boolean(fichier?.apercuUrl && (etat === 'recu' || etat === 'en_verification'));
  const libelle = pieceLabel(pieceKey);

  useEffect(() => {
    queueMicrotask(() => {
      setCommentaire(demande.validationsParPiece?.[pieceKey]?.commentaire ?? '');
    });
  }, [demande, pieceKey]);

  const enregistrer = async (statut) => {
    setSaving(true);
    try {
      inscriptionDemandeService.setPieceValidation(demande.id, pieceKey, {
        statut,
        commentaire: commentaire.trim(),
      });
      onUpdated?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-light-gray bg-white">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-1 gap-3">
          <div className="shrink-0">
            {apercuDispo ? (
              <button
                type="button"
                onClick={() => onOpenApercu?.()}
                className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-light-gray bg-off-white ring-1 ring-slate-100 transition hover:border-amber-300 hover:ring-amber-200/50"
                title="Agrandir l’aperçu"
                aria-label={`Aperçu — ${libelle}`}
              >
                <img
                  src={fichier.apercuUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <span className="absolute inset-0 flex items-end justify-end bg-gradient-to-t from-black/40 p-1 opacity-0 transition group-hover:opacity-100">
                  <Maximize2 className="h-3.5 w-3.5 text-white drop-shadow" />
                </span>
              </button>
            ) : (
              <div className="flex h-20 w-20 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-light-gray bg-white p-1">
                <FileText className="h-7 w-7 text-slate-400" strokeWidth={1.5} />
                <span className="text-[8px] font-medium text-slate-500">Aucun</span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h5 className="text-sm font-semibold text-slate-900">{libelle}</h5>
              {v?.statut === 'conforme' && <Badge tone="valide">Conforme</Badge>}
              {v?.statut === 'non_conforme' && <Badge tone="refuse">Non conforme</Badge>}
              {ctrl && !v?.statut && <Badge tone="en_attente">Non contrôlé</Badge>}
            </div>
            <p className={`mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium ${tone}`}>
              <EtatIcon size={14} /> {etatFichierLabel}
            </p>
            {fichier?.nom && (
              <p className="mt-1.5 line-clamp-1 font-mono text-[11px] text-slate-500">
                {fichier.nom}
                {fichier.taille ? ` · ${fichier.taille}` : ''}
              </p>
            )}
          </div>
        </div>
        {apercuDispo && (
          <div className="flex shrink-0 sm:items-center">
            <Button type="button" variant="secondary" size="sm" onClick={() => onOpenApercu?.()} icon={Maximize2}>
              Aperçu
            </Button>
          </div>
        )}
      </div>
      {ctrl && (
        <div className="space-y-4 border-t border-light-gray bg-off-white px-4 py-4 sm:px-4">
          <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Décision</p>
              <div className="mt-2 inline-flex w-full overflow-hidden rounded-xl border border-light-gray bg-white">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => enregistrer('conforme')}
                  className={`flex-1 px-3 py-2.5 text-sm font-semibold transition ${
                    v?.statut === 'conforme'
                      ? 'bg-emerald-50 text-emerald-900 ring-1 ring-inset ring-emerald-200'
                      : 'text-slate-700 hover:bg-slate-50'
                  } ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} className={v?.statut === 'conforme' ? 'text-emerald-700' : 'text-slate-400'} />
                    Conforme
                  </span>
                </button>
                <div className="w-px bg-light-gray" aria-hidden />
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => enregistrer('non_conforme')}
                  className={`flex-1 px-3 py-2.5 text-sm font-semibold transition ${
                    v?.statut === 'non_conforme'
                      ? 'bg-red-50 text-red-900 ring-1 ring-inset ring-red-200'
                      : 'text-slate-700 hover:bg-slate-50'
                  } ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <AlertCircle size={16} className={v?.statut === 'non_conforme' ? 'text-red-700' : 'text-slate-400'} />
                    Non conforme
                  </span>
                </button>
              </div>
              <p className="mt-2 text-xs text-text-light">
                Choisissez une décision, puis indiquez une remarque si nécessaire.
              </p>
            </div>

            <div className="lg:col-span-7">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">Remarque</label>
              <textarea
                className="input mt-2 min-h-[4.25rem] w-full resize-y py-2.5 text-sm"
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                placeholder="Ex. pièce illisible, mauvaise page, date manquante…"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DemandeReviewView({ demande, onBack, onAccepter, onRefuser, onAfterMutation }) {
  const [view, setView] = useState('detail');
  const [motif, setMotif] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [apercuPiece, setApercuPiece] = useState(null);

  const refresh = () => onAfterMutation?.();

  useEffect(() => {
    if (demande) {
      queueMicrotask(() => {
        setApercuPiece(null);
        setView('detail');
        setMotif('');
        setMessage(
          `Bonjour ${demande.candidat.prenom},\n\n` +
            `Votre demande d’inscription à l’ESP ne peut pas être acceptée en l’état.\n\n` +
            `Motif : [à compléter]\n\n` +
            `Vous pouvez corriger votre dossier depuis l’application mobile et soumettre à nouveau.\n\n` +
            `Cordialement,\nDirection de la scolarité`,
        );
      });
    }
  }, [demande?.id]);

  if (!demande) return null;

  const c = demande.candidat;
  const pending = demande.decision === 'en_attente';
  const isNouveau = demande.type === 'nouvelle_inscription';

  const toutesPretes = (() => {
    const p = demande.pieces || {};
    for (const [k, etat] of Object.entries(p)) {
      if (!needControl(etat)) continue;
      if (demande.validationsParPiece?.[k]?.statut !== 'conforme') return false;
    }
    return true;
  })();

  const typeLabel = demande.type === 'reinscription' ? 'Réinscription (app mobile)' : 'Nouvelle inscription (app mobile)';

  const handleRefusSubmit = async () => {
    if (!motif.trim()) return;
    const finalMsg = message.includes('[à compléter]') ? message.replace('[à compléter]', motif.trim()) : message;
    setBusy(true);
    try {
      await onRefuser?.({ motif: motif.trim(), message: finalMsg.trim() });
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = async () => {
    setBusy(true);
    try {
      await onAccepter?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-light-gray bg-white px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button variant="secondary" size="sm" onClick={onBack} className="shrink-0">
              <ArrowLeft size={16} /> Retour à la file
            </Button>
            <div className="h-6 w-px bg-light-gray" />
            <div className="min-w-0">
              <h2 className="truncate font-serif text-lg font-semibold text-slate-900 sm:text-xl">Dossier {demande.id}</h2>
              <p className="truncate text-xs text-slate-500 sm:text-sm">
                {c.prenom} {c.nom} · soumis {formatDt(demande.dateSoumission)}
              </p>
            </div>
          </div>
          {view === 'detail' && pending && (
            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
              <Button variant="ghost" size="sm" onClick={onBack}>
                Fermer
              </Button>
              <Button variant="danger" size="sm" onClick={() => setView('refuse')} disabled={busy}>
                Refuser
              </Button>
              <Button
                variant="gold"
                size="sm"
                onClick={handleAccept}
                disabled={busy || !toutesPretes}
                title={toutesPretes ? 'Créer le compte étudiant' : 'Validez chaque pièce reçue comme « Conforme »'}
              >
                {busy ? 'Traitement…' : 'Accepter et créer le compte'}
              </Button>
            </div>
          )}
          {view === 'refuse' && (
            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
              <Button variant="ghost" size="sm" onClick={() => setView('detail')} disabled={busy}>
                Annuler
              </Button>
              <Button variant="danger" size="sm" onClick={handleRefusSubmit} disabled={busy || !motif.trim()}>
                {busy ? 'Envoi…' : 'Envoyer le refus (e-mail + WhatsApp)'}
              </Button>
            </div>
          )}
        </div>
        {view === 'detail' && pending && !toutesPretes && (
          <p className="mt-3 w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Contrôle requis : pour chaque pièce reçue, validez la conformité avant d’accepter.
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {view === 'refuse' ? (
          <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6">
            <div>
              <label className="label">Motif du refus (obligatoire)</label>
              <textarea
                className="input min-h-[5rem] resize-y py-3 font-sans"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Message envoyé (même contenu e-mail + WhatsApp)</label>
              <textarea
                className="input min-h-[12rem] resize-y py-3 font-sans text-[0.9375rem] leading-relaxed"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-light-gray bg-white p-4">
                <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                  <Mail size={14} className="text-amber-500" /> E-mail
                </p>
                <p className="break-all text-sm text-slate-900">{demande.emailNotif}</p>
              </div>
              <div className="rounded-lg border border-light-gray bg-white p-4">
                <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                  <MessageCircle size={14} className="text-amber-500" /> WhatsApp
                </p>
                <p className="font-mono text-sm text-slate-900">{demande.whatsappNotif}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-6 px-4 py-5 sm:px-6 lg:px-8">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Fiche candidat (vue bureau)</p>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
              <div className="flex min-h-0 lg:col-span-3">
                <CandidatPortrait candidat={c} typeLabel={typeLabel} demande={demande} />
              </div>
              <div className="grid min-h-0 auto-rows-fr grid-cols-1 content-stretch gap-6 md:grid-cols-2 lg:col-span-9">
                <Section title="Identité & cursus secondaire" icon={User}>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <InfoItem label="NNI" value={c.nni} />
                    <InfoItem label="N° Bac" value={c.numeroBac} />
                    <InfoItem label="Date / lieu de naissance" value={`${c.dateNaissance} · ${c.lieuNaissance}`} />
                    <InfoItem label="Nationalité" value={c.nationalite} />
                    <InfoItem label="Sexe" value={c.sexe === 'F' ? 'Féminin' : 'Masculin'} />
                    <InfoItem label="Nom arabe" value={c.nomAr} dir="rtl" />
                    <InfoItem label="Catégorie / série Bac" value={`${c.categorieBac} · ${c.serieBac}`} />
                    <InfoItem label="École du Bac" value={c.ecoleBac} />
                    <InfoItem label="Compte Bankily" value={c.compteBankily} />
                    <InfoItem label="Résident chez les parents" value={c.residentAvecParents} />
                  </div>
                </Section>
                <Section title="Scolarité demandée" icon={GraduationCap}>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <InfoItem label="Département" value={c.filiere ?? c.scolarite?.filiere} />
                    <InfoItem label="Année (niveau)" value={c.scolarite?.niveau} />
                    <InfoItem label="Voie d’accès" value={c.scolarite?.voieAcces} />
                    <InfoItem label="1ʳᵉ année universitaire" value={c.scolarite?.anneeUni1ere} />
                    <InfoItem label="Diplôme d’accès" value={c.scolarite?.diplomeAcces} />
                    <InfoItem label="Établissement (1er cycle)" value={c.scolarite?.etablissementPremierCycle} />
                  </div>
                </Section>
              </div>
            </div>

            <div className="w-full min-w-0">
              <Section title="Famille & contact" icon={Users}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <InfoItem label="Père" value={`${c.parents?.prenomPere ?? '—'} — ${c.parents?.fonctionPere ?? '—'}`} />
                  <InfoItem
                    label="Mère"
                    value={`${c.parents?.prenomMere ?? ''} ${c.parents?.nomMere ?? ''} — ${c.parents?.fonctionMere ?? '—'}`}
                  />
                  <InfoItem label="Tél. 1" value={c.contact?.telephone} />
                  <InfoItem label="Tél. 2 (WhatsApp)" value={c.contact?.tel2} />
                  {!isNouveau && <InfoItem label="E-mail institutionnel (ESP)" value={c.contact?.emailPro} />}
                  {isNouveau && (
                    <div className="rounded-lg border border-light-gray bg-off-white p-3 text-sm text-text-light sm:col-span-2 lg:col-span-3">
                      L’adresse de messagerie <span className="text-slate-900">@esp.mr</span> n’est pas saisie par le
                      candidat : elle est attribuée par la scolarité une fois le dossier accepté.
                    </div>
                  )}
                  <InfoItem label="E-mail personnel" value={c.contact?.emailPerso} />
                  <InfoItem label="Adresse" value={c.contact?.adresse} />
                </div>
              </Section>
            </div>

            <div className="w-full min-w-0">
              <div className="overflow-hidden rounded-xl border border-light-gray bg-white">
                <div className="flex items-center gap-2 border-b border-light-gray bg-amber-50 px-4 py-3 sm:px-5">
                  <FileStack className="text-amber-700" size={20} />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Pièces justificatives — contrôle & conformité</h3>
                    <p className="text-xs text-text-light">
                      Présentation alignée sur les pièces du formulaire « Nouvel étudiant » (dépôt + aperçu)
                    </p>
                  </div>
                </div>
                <div className="space-y-4 p-4 sm:p-5">
                  {Object.entries(demande.pieces ?? {}).map(([k, etat]) => (
                    <PieceControleBlock
                      key={k}
                      demande={demande}
                      pieceKey={k}
                      etat={etat}
                      fichier={demande.fichiersPieces?.[k]}
                      onUpdated={refresh}
                      onOpenApercu={() => setApercuPiece(k)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {demande.decision === 'refusee' && demande.motifRefus && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-xs font-bold uppercase text-brand-red">Dossier refusé</p>
                <p className="mt-1 text-sm text-red-900/85">{demande.motifRefus}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <ApercuPieceModal
        open={Boolean(apercuPiece)}
        onClose={() => setApercuPiece(null)}
        fichier={apercuPiece ? demande.fichiersPieces?.[apercuPiece] : null}
        label={apercuPiece ? pieceLabel(apercuPiece) : ''}
      />
    </div>
  );
}
