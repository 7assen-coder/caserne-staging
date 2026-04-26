import { useEffect, useMemo, useState } from 'react';
import {
  Shield,
  KeyRound,
  Lock,
  CheckCircle2,
  Headphones,
  IdCard,
  Info,
  UserPlus,
} from 'lucide-react';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import FullScreenLayer from '../../components/common/FullScreenLayer';
import SelectField from '../../components/common/SelectField';
import { useAuth } from '../../hooks/useAuth';
import { FONCTION_LABEL, FONCTIONS } from '../../utils/constants';
import { initials } from '../../utils/formatters';

const STORAGE_PROFIL_PREFS = 'esp_profil_alerts';
const STORAGE_NOTIF_CANAUX = 'esp_notif_canaux';
const STORAGE_EQUIPE_INV = 'esp_equipe_invites';

function loadJson(key, fallback) {
  try {
    const r = localStorage.getItem(key);
    return r ? { ...fallback, ...JSON.parse(r) } : fallback;
  } catch {
    return fallback;
  }
}

function PageIntro({ kicker, title, subtitle }) {
  return (
    <div className="mb-8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{kicker}</p>
      <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">{title}</h1>
      {subtitle && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-light">{subtitle}</p>}
    </div>
  );
}

function FicheSection({ title, icon: Icon, children, className = '' }) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-light-gray bg-white shadow-sm ring-1 ring-slate-100 ${className}`}
    >
      <h2 className="flex items-center gap-2 border-b border-light-gray px-4 py-3.5 text-sm font-semibold text-slate-900 sm:px-5">
        {Icon && <Icon size={18} className="shrink-0 text-amber-500/90" strokeWidth={2} />}
        {title}
      </h2>
      <div className="px-4 py-4 sm:px-5 sm:py-4">{children}</div>
    </section>
  );
}

function FicheInfo({ label, value, dir }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-0.5 break-words text-sm text-slate-900" dir={dir}>
        {value ?? '—'}
      </p>
    </div>
  );
}

function ProfilSwitch({ on, onToggle, label, description }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-light-gray bg-off-white px-3 py-3 sm:px-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="mt-0.5 text-xs text-text-light">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        className={`relative h-8 w-14 shrink-0 rounded-full transition ${on ? 'bg-brand-green' : 'bg-slate-300'}`}
      >
        <span
          className={`pointer-events-none absolute top-1 left-1 h-6 w-6 rounded-full bg-slate-100 shadow transition-transform duration-200 ${
            on ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export function ParametresProfil() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState(() =>
    loadJson(STORAGE_PROFIL_PREFS, { emailResumes: true, absencesSI: true }),
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_PROFIL_PREFS, JSON.stringify(prefs));
  }, [prefs]);

  if (!user) return null;

  return (
    <>
      <PageIntro
        kicker="Fiche compte"
        title="Profil"
        subtitle="Identité et coordonnées tels qu’enregistrés par la scolarité. Cette fiche est consultative : toute
        modification passe par l’équipe administrative (comme le dossier d’inscription côté candidat)."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
        <div className="lg:col-span-4">
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-light-gray bg-white ring-1 ring-slate-100">
            <div className="relative w-full min-h-[240px] flex-1 sm:min-h-[280px]">
              <div className="flex h-full min-h-[240px] w-full flex-col items-center justify-center bg-gradient-to-b from-navy-900 to-navy p-6">
                <div className="grid h-28 w-28 place-items-center rounded-2xl border border-white/20 bg-white/10 text-3xl font-serif font-semibold text-gold shadow-inner">
                  {initials(user.nom, user.prenom)}
                </div>
                <p className="mt-3 text-center text-xs text-white/75">Photo d’identité (identité gérée par la scolarité)</p>
              </div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
            </div>
            <div className="shrink-0 space-y-2 border-t border-light-gray bg-off-white p-4 text-center">
              <p className="font-serif text-lg font-semibold text-slate-900">
                {user.prenom} {user.nom}
              </p>
              <p className="font-mono text-[11px] text-text-light">Matricule {user.matricule}</p>
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-medium text-amber-900">
                  {FONCTION_LABEL[user.fonction] ?? '—'}
                </span>
                <Badge tone="navy">{user.grade}</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="grid min-h-0 content-start gap-6 lg:col-span-8">
          <FicheSection title="Identité & affectation" icon={IdCard}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FicheInfo label="Prénom" value={user.prenom} />
              <FicheInfo label="Nom" value={user.nom} />
              <FicheInfo label="E-mail professionnel" value={user.email} />
              <FicheInfo label="Téléphone" value="+213 661 00 22 11" />
              <FicheInfo label="Fonction (habilitation)" value={FONCTION_LABEL[user.fonction] ?? '—'} />
              <FicheInfo label="Service" value="Direction de la scolarité" />
            </div>
            <p className="mt-4 flex items-start gap-2 rounded-lg border border-light-gray bg-off-white px-3 py-2.5 text-xs text-text-light">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600/80" />
              <span>Les mises à jour d’identité, photo et grade sont tracées et validées côté administration.</span>
            </p>
          </FicheSection>

          <FicheSection title="Préférences d’alerte (informations)" icon={Headphones}>
            <p className="text-sm text-slate-500">
              Activez ou désactivez la réception d’alertes d’information sur ce compte. Les habilitations métier
              s’appliquent toujours.
            </p>
            <div className="mt-4 space-y-3">
              <ProfilSwitch
                label="Résumé par e-mail (08:00)"
                description="Digest quotidien des files et actions à traiter"
                on={prefs.emailResumes}
                onToggle={() => setPrefs((p) => ({ ...p, emailResumes: !p.emailResumes }))}
              />
              <ProfilSwitch
                label="Alertes absences (SI)"
                description="Lorsqu’un étudiant est porté absent (appel, suivi) — y compris non justifié"
                on={prefs.absencesSI}
                onToggle={() => setPrefs((p) => ({ ...p, absencesSI: !p.absencesSI }))}
              />
            </div>
            <p className="mt-3 flex items-start gap-2 text-xs text-slate-600">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Préférences enregistrées sur cet appareil (démo). En production : synchronisation compte côté serveur.
            </p>
          </FicheSection>
        </div>
      </div>
    </>
  );
}

export function ParametresCompte() {
  const { user } = useAuth();
  const [currentPwd, setCurrentPwd] = useState('');
  const [reauth, setReauth] = useState(false);
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [reauthErr, setReauthErr] = useState(null);
  const [pwdErr, setPwdErr] = useState(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canUnlock = currentPwd.length >= 1;
  const canSave =
    reauth &&
    pwdNew.length >= 8 &&
    pwdNew === pwdConfirm &&
    (currentPwd ? pwdNew !== currentPwd : true);

  const handleVerify = (e) => {
    e.preventDefault();
    setReauthErr(null);
    if (!canUnlock) {
      setReauthErr('Saisissez votre mot de passe actuel.');
      return;
    }
    setReauth(true);
  };

  const handlePasswordUpdate = (e) => {
    e.preventDefault();
    setPwdErr(null);
    if (!reauth) return;
    if (pwdNew.length < 8) {
      setPwdErr('Le nouveau mot de passe doit comporter au moins 8 caractères.');
      return;
    }
    if (pwdNew !== pwdConfirm) {
      setPwdErr('La confirmation ne correspond pas.');
      return;
    }
    if (pwdNew === currentPwd) {
      setPwdErr('Le nouveau mot de passe doit être différent de l’actuel.');
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setDone(true);
      setPwdNew('');
      setPwdConfirm('');
    }, 600);
  };

  return (
    <>
      <PageIntro
        kicker="Paramètres"
        title="Compte & sécurité"
        subtitle="Mot de passe et session. En démonstration, aucune requête n’est envoyée au serveur."
      />

      <div className="w-full space-y-6">
        <div className="overflow-hidden rounded-2xl border border-light-gray bg-white shadow-card">
          <div className="border-b border-light-gray bg-off-white px-6 py-5 md:px-8 md:py-6">
            <h2 className="font-serif text-lg font-semibold text-slate-900 md:text-xl">Sécurisation du compte</h2>
            <p className="mt-1 max-w-3xl text-sm text-text-light">
              Confirmez d’abord votre identité avec le mot de passe actuel, puis saisissez le nouveau. Compte :{' '}
              <span className="font-mono text-amber-700">{user?.email}</span>
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="inline-flex h-6 items-center rounded-full border border-light-gray bg-white px-2.5">
                1. Vérification
              </span>
              <span className="text-slate-400">→</span>
              <span
                className={`inline-flex h-6 items-center rounded-full border px-2.5 ${
                  reauth ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-light-gray bg-white text-slate-600'
                }`}
              >
                2. Nouveau mot de passe
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="border-b border-light-gray p-6 md:p-8 lg:border-b-0 lg:border-r lg:border-light-gray">
              <div className="mb-4 flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700">
                  <Lock size={18} />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">Vérification d’identité</h3>
              </div>
              <p className="text-sm leading-relaxed text-text-light">
                Saisissez le mot de passe en cours d’utilisation pour cette session. Sans cette étape, la modification
                est bloquée.
              </p>
              <form onSubmit={handleVerify} className="mt-5 space-y-4">
                <div>
                  <label className="label" htmlFor="reauth-pwd">
                    Mot de passe actuel
                  </label>
                  <input
                    id="reauth-pwd"
                    type="password"
                    className="input w-full"
                    autoComplete="current-password"
                    value={currentPwd}
                    onChange={(e) => {
                      setCurrentPwd(e.target.value);
                      if (reauth) setReauth(false);
                    }}
                    placeholder="••••••••"
                  />
                </div>
                {reauthErr && !reauth && <p className="text-sm text-brand-red">{reauthErr}</p>}
                {reauth ? (
                  <p className="flex items-center gap-2 text-sm text-brand-green">
                    <CheckCircle2 size={16} className="shrink-0" />
                    Session confirmée — vous pouvez mettre à jour le mot de passe.
                  </p>
                ) : (
                  <Button type="submit" variant="primary" size="md" icon={KeyRound} disabled={!canUnlock} className="w-full sm:w-auto">
                    Confirmer l’identité
                  </Button>
                )}
              </form>
            </div>

            <div
              className={`p-6 md:p-8 ${!reauth ? 'relative' : ''}`}
            >
              {!reauth && (
                <div
                  className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-white/70 backdrop-blur-[1px] md:rounded-r-2xl"
                  aria-hidden
                >
                  <p className="max-w-xs rounded-lg border border-light-gray bg-white px-4 py-2.5 text-center text-xs text-text-light shadow-lg">
                    Confirmez d’abord l’identité à gauche.
                  </p>
                </div>
              )}
              <div className="mb-4 flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-lg border border-light-gray bg-off-white text-slate-700">
                  <Shield size={18} />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">Nouveau mot de passe</h3>
              </div>
              <p className="text-sm text-text-light">Au moins 8 caractères ; combinez lettres et chiffres en production.</p>
              <form onSubmit={handlePasswordUpdate} className="mt-5 space-y-4">
                <div>
                  <label className="label" htmlFor="pwd-new">
                    Nouveau mot de passe
                  </label>
                  <input
                    id="pwd-new"
                    type="password"
                    className="input w-full"
                    autoComplete="new-password"
                    value={pwdNew}
                    onChange={(e) => setPwdNew(e.target.value)}
                    placeholder="Nouveau mot de passe"
                    disabled={!reauth}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="pwd-confirm">
                    Confirmer
                  </label>
                  <input
                    id="pwd-confirm"
                    type="password"
                    className="input w-full"
                    autoComplete="new-password"
                    value={pwdConfirm}
                    onChange={(e) => setPwdConfirm(e.target.value)}
                    placeholder="Même saisie"
                    disabled={!reauth}
                  />
                </div>
                {reauth && pwdErr && <p className="text-sm text-brand-red">{pwdErr}</p>}
                {done && (
                  <p className="flex items-center gap-2 text-sm text-brand-green">
                    <CheckCircle2 size={16} className="shrink-0" />
                    Mise à jour enregistrée (simulation locale).
                  </p>
                )}
                <Button
                  type="submit"
                  variant="gold"
                  size="md"
                  disabled={!canSave || submitting || !reauth}
                  className="w-full sm:w-auto"
                >
                  {submitting ? 'Enregistrement…' : 'Enregistrer le nouveau mot de passe'}
                </Button>
              </form>
            </div>
          </div>
        </div>

        <FicheSection title="Sessions" icon={KeyRound} className="!shadow-none">
          <p className="text-sm leading-relaxed text-slate-500">
            Aucun autre appareil n’est listé en démonstration. En exploitation, la liste des sessions et la révocation
            s’affichent ici.
          </p>
        </FicheSection>
      </div>
    </>
  );
}

export function ParametresNotifications() {
  const [items, setItems] = useState(() =>
    loadJson(STORAGE_NOTIF_CANAUX, { dossiers: true, inscriptions: true, absences: true }),
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_NOTIF_CANAUX, JSON.stringify(items));
  }, [items]);

  const toggle = (k) => setItems((s) => ({ ...s, [k]: !s[k] }));

  return (
    <>
      <PageIntro
        kicker="Paramètres"
        title="Notifications"
        subtitle="Choisissez les alertes à recevoir dans l’application et par e-mail."
      />
      <Card title="Canaux" bodyClassName="!p-0">
        <ul className="divide-y divide-light-gray">
          {[
            { k: 'dossiers', t: 'Dossiers étudiants', d: 'Pièces manquantes, validations' },
            { k: 'inscriptions', t: 'Inscriptions', d: 'Nouvelles demandes et relances' },
            {
              k: 'absences',
              t: 'Absences (étudiants)',
              d: "Alerte dès qu'un étudiant est déclaré absent (cours, appel, manque de justificatif)",
            },
          ].map((row) => (
            <li key={row.k} className="flex items-center justify-between gap-4 px-5 py-4 md:px-6">
              <div>
                <p className="font-medium text-slate-900">{row.t}</p>
                <p className="text-sm text-text-light">{row.d}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={items[row.k]}
                onClick={() => toggle(row.k)}
                className={`relative h-8 w-14 shrink-0 rounded-full transition ${
                  items[row.k] ? 'bg-brand-green' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none absolute top-1 left-1 h-6 w-6 rounded-full bg-slate-100 shadow transition-transform duration-200 ${
                    items[row.k] ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

const HAB_LABELS = {
  all: { label: 'Tous accès (administration)', tone: 'gold' },
  inscriptions: { label: 'Inscriptions & admissibilité', tone: 'navy' },
  eleves: { label: 'Gestion des étudiants', tone: 'valide' },
  dossiers: { label: 'Dossiers & pièces', tone: 'navy' },
  presence: { label: 'Présence & absences', tone: 'neutral' },
  lecture: { label: 'Consultation seule', tone: 'neutral' },
  parametres: { label: 'Paramètres & équipe', tone: 'en_attente' },
};

const EXTRA_MEMBRES = [
  {
    id: 'ext1',
    prenom: 'Aïcha',
    nom: 'MINT MOHAMED',
    email: 'a.mint@esp.mr',
    grade: 'Adjointe',
    fonction: FONCTIONS.ENCADREMENT,
    habilitations: ['inscriptions', 'lecture'],
  },
  {
    id: 'ext2',
    prenom: 'Brahim',
    nom: 'OULD ELI',
    email: 'b.eli@esp.mr',
    grade: 'Secrétaire pédago.',
    fonction: FONCTIONS.ENCADREMENT,
    habilitations: ['dossiers', 'eleves'],
  },
  {
    id: 'ext3',
    prenom: 'Khadijetou',
    nom: 'MINT SIDI',
    email: 'k.sidi@esp.mr',
    grade: 'Stagiaire scolarité',
    fonction: FONCTIONS.TERRAIN,
    habilitations: ['lecture', 'presence'],
  },
];

function habBadgesForFonction(f) {
  if (f === FONCTIONS.COMMANDEMENT) return ['all', 'parametres'];
  if (f === FONCTIONS.ENCADREMENT) return ['inscriptions', 'eleves', 'parametres'];
  return ['presence', 'lecture', 'dossiers'];
}

function optionsHabilitationInvite(fonctionCreateur) {
  if (fonctionCreateur === FONCTIONS.COMMANDEMENT) {
    return [
      {
        value: FONCTIONS.ENCADREMENT,
        label: 'Encadrement — inscriptions, dossiers, suivi pédagogique',
      },
      {
        value: FONCTIONS.TERRAIN,
        label: 'Terrain — présence, absences, consultation selon affectation',
      },
      {
        value: FONCTIONS.COMMANDEMENT,
        label: 'Commandement — remplacement / intérim (même niveau d’administration que vous)',
      },
    ];
  }
  return [
    {
      value: FONCTIONS.TERRAIN,
      label: 'Terrain — seul rôle autorisé pour un compte créé par votre profil (Encadrement ou Terrain)',
    },
  ];
}

function InviteMembreModal({ open, onClose, onCompteCree, fonctionCreateur }) {
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [grade, setGrade] = useState('');
  const [fonction, setFonction] = useState(FONCTIONS.TERRAIN);
  const [commentaire, setCommentaire] = useState('');
  const [etape, setEtape] = useState('formulaire');
  const [mdpProvisoire, setMdpProvisoire] = useState('');

  const estAdmin = fonctionCreateur === FONCTIONS.COMMANDEMENT;
  const choixHabilitation = useMemo(
    () => optionsHabilitationInvite(fonctionCreateur),
    [fonctionCreateur],
  );

  useEffect(() => {
    if (open) return;
    queueMicrotask(() => {
      setEtape('formulaire');
      setPrenom('');
      setNom('');
      setEmail('');
      setGrade('');
      setFonction(FONCTIONS.TERRAIN);
      setCommentaire('');
      setMdpProvisoire('');
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!choixHabilitation.length) return;
    queueMicrotask(() => setFonction(choixHabilitation[0].value));
  }, [open, choixHabilitation]);

  const soumettre = (e) => {
    e.preventDefault();
    const p = prenom.trim();
    const n = nom.trim();
    if (!p || !n) return;
    const mail = email.trim().toLowerCase();
    if (!mail || !mail.includes('@')) return;

    const id = `inv-${Date.now()}`;
    const mat = `INV/${String(100 + Math.floor(Math.random() * 900))}`;
    const mdp = `Esp!${Math.random().toString(36).slice(2, 8)}26`;
    const habilitationCible = estAdmin ? fonction : FONCTIONS.TERRAIN;
    onCompteCree({
      id,
      prenom: p,
      nom: n.toUpperCase(),
      email: mail,
      grade: grade.trim() || 'Agent de scolarité',
      fonction: habilitationCible,
      matricule: mat,
      commentaire: commentaire.trim() || null,
    });
    setMdpProvisoire(mdp);
    setEtape('succes');
  };

  return (
    <FullScreenLayer
      open={open}
      onClose={onClose}
      title="Inviter un membre d’équipe"
      subtitle={
        estAdmin
          ? "Création d'un compte @esp.mr — vous pouvez affecter Encadrement, Terrain ou un remplacement Commandement (démo)."
          : "Création d'un compte @esp.mr — l'habilitation du nouveau membre est limitée à Terrain (démo)."
      }
      chrome
      contentClassName="p-5 sm:p-6"
    >
      {etape === 'formulaire' ? (
        <form onSubmit={soumettre} className="space-y-4">
          <p className="rounded-lg border border-light-gray bg-off-white px-3 py-2.5 text-xs leading-relaxed text-text-light">
            {estAdmin ? (
              <>
                En tant qu’<strong className="text-slate-900">administrateur (Commandement)</strong>, vous pouvez créer
                un compte <strong className="text-slate-900">Encadrement</strong>,{' '}
                <strong className="text-slate-900">Terrain</strong> ou un{' '}
                <strong className="text-slate-900">remplaçant Commandement</strong> (intérim).
              </>
            ) : (
              <>
                Avec votre profil (Encadrement ou Terrain), seule l’habilitation{' '}
                <strong className="text-slate-900">Terrain</strong> peut être attribuée au nouveau compte. Pour créer
                d’autres rôles, l’opération doit être effectuée par l’administration.
              </>
            )}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Prénom</span>
              <input className="input" value={prenom} onChange={(e) => setPrenom(e.target.value)} required />
            </label>
            <label className="block">
              <span className="label">Nom</span>
              <input className="input" value={nom} onChange={(e) => setNom(e.target.value)} required />
            </label>
          </div>
          <label className="block">
            <span className="label">E-mail professionnel (connexion)</span>
            <input
              type="email"
              className="input font-mono text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@esp.mr"
              required
            />
          </label>
          <label className="block">
            <span className="label">Titre / grade affiché</span>
            <input
              className="input"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="Ex. Adjointe à la scolarité"
            />
          </label>
          {estAdmin ? (
            <SelectField
              id="invite-role-hab"
              label="Habilitation (rôle applicatif) du nouveau compte"
              value={fonction}
              onChange={setFonction}
              options={choixHabilitation}
            />
          ) : (
            <div className="rounded-lg border border-light-gray bg-off-white px-3 py-3">
              <p className="label mb-0">Habilitation (rôle applicatif)</p>
              <p className="mt-1 text-sm font-medium text-amber-800">Terrain (imposé)</p>
              <p className="mt-0.5 text-xs text-text-light">Non modifiable avec votre profil actuel.</p>
            </div>
          )}
          <label className="block">
            <span className="label">Commentaire (interne, optionnel)</span>
            <textarea
              className="input min-h-[4.5rem] resize-y py-2 text-sm"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Contexte, date d’arrivée, accès ciblés…"
            />
          </label>
          <div className="flex flex-wrap justify-end gap-2 border-t border-light-gray pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" icon={UserPlus}>
              Créer le compte
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="flex items-center gap-2 text-sm text-brand-green">
            <CheckCircle2 size={18} className="shrink-0" />
            Compte généré (simulation). Transmettez le mot de passe provisoire sur un canal sécurisé.
          </p>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900/70">Mot de passe provisoire</p>
            <p className="mt-2 select-all break-all font-mono text-base text-amber-900">{mdpProvisoire}</p>
            <p className="mt-2 text-xs text-amber-800/70">
              Changement obligatoire à la première connexion (politique type production).
            </p>
          </div>
          <p className="text-xs text-text-light">
            Le membre apparaît dans l’annuaire ci-dessous. Les habilitations sont alignées sur le rôle choisi.
          </p>
          <Button type="button" variant="primary" className="w-full" onClick={onClose}>
            Fermer
          </Button>
        </div>
      )}
    </FullScreenLayer>
  );
}

export function ParametresEquipe() {
  const { demoUsers, user, login } = useAuth();
  const [inviteOuvert, setInviteOuvert] = useState(false);
  const [comptesInvites, setComptesInvites] = useState(() => {
    try {
      const r = sessionStorage.getItem(STORAGE_EQUIPE_INV);
      return r ? JSON.parse(r) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_EQUIPE_INV, JSON.stringify(comptesInvites));
    } catch {
      /* ignore */
    }
  }, [comptesInvites]);

  const ajouterCompte = (u) => {
    setComptesInvites((list) => [...list, { ...u, source: 'invité' }]);
  };

  const membres = useMemo(() => {
    const base = demoUsers.map((u) => ({
      ...u,
      habilitations: habBadgesForFonction(u.fonction),
      source: 'officiel',
    }));
    const ext = EXTRA_MEMBRES.map((m) => ({
      ...m,
      id: m.id,
      matricule: `EXT-${m.id}`,
      source: 'étendu',
    }));
    const inv = comptesInvites.map((c) => ({
      ...c,
      habilitations: habBadgesForFonction(c.fonction),
    }));
    return [...base, ...ext, ...inv];
  }, [demoUsers, comptesInvites]);

  return (
    <>
      <PageIntro
        kicker="Paramètres"
        title="Équipe & habilitations"
        subtitle="Gouvernance des accès : rôles métier, collaborateurs et périmètre d’action."
      />

      <div className="w-full space-y-6">
        <Card
          className="!bg-white"
          accent="gold"
          title="Rôles et périmètres"
          subtitle="Chaque poste reçoit un ensemble d’habilitations, sous contrôle du commandement."
        >
          <ul className="list-inside list-disc space-y-2 text-sm text-text-light">
            <li>
              <strong className="text-slate-900">Administration (commandement)</strong> : validation
              finale, paramètres, pilotage d’équipe.
            </li>
            <li>
              <strong className="text-slate-900">Encadrement</strong> : inscriptions, dossiers
              pédagogiques, suivi ciblé.
            </li>
            <li>
              <strong className="text-slate-900">Terrain</strong> : présence, absences, consultation
              restreinte selon affectation.
            </li>
          </ul>
        </Card>

        <Card
          className="!bg-white"
          title="Membres et collaborateurs"
          subtitle="Annuaire interne (démo) — basculez de rôle sur les comptes de test."
          bodyClassName="!p-0"
          actions={
            <Button type="button" variant="secondary" size="sm" onClick={() => setInviteOuvert(true)} icon={UserPlus}>
              Inviter un membre
            </Button>
          }
        >
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-light-gray bg-off-white text-[10px] font-bold uppercase tracking-wider text-slate-600">
                <th className="px-4 py-3">Membre</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Fonction</th>
                <th className="px-4 py-3">Habilitations</th>
                <th className="w-32 px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-gray">
              {membres.map((m) => {
                const isU = user?.id === m.id;
                const inDemo = demoUsers.some((d) => d.id === m.id);
                const estInvite = m.source === 'invité' || (typeof m.id === 'string' && m.id.startsWith('inv-'));
                return (
                  <tr key={m.id} className="bg-white hover:bg-off-white">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-light-gray bg-off-white text-xs font-semibold text-navy">
                          {m.prenom[0]}
                          {m.nom[0]}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {m.grade} {m.prenom} {m.nom}
                          </p>
                          <p className="font-mono text-[10px] text-text-light">{m.matricule}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-text-light">{m.email}</td>
                    <td className="px-4 py-3 text-slate-900">{FONCTION_LABEL[m.fonction]}</td>
                    <td className="px-4 py-3">
                      <div className="flex max-w-md flex-wrap gap-1">
                        {(m.habilitations || []).map((h) => {
                          const def = HAB_LABELS[h] ?? { label: h, tone: 'neutral' };
                          return (
                            <Badge key={h} tone={def.tone}>
                              {def.label}
                            </Badge>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inDemo ? (
                        isU ? (
                          <Badge tone="valide">Vous</Badge>
                        ) : (
                          <Button type="button" size="sm" variant="secondary" onClick={() => login(m.fonction)}>
                            Se connecter en tant que
                          </Button>
                        )
                      ) : estInvite ? (
                        <Badge tone="en_attente">Compte invité</Badge>
                      ) : (
                        <span className="text-xs text-slate-500">Rôle attribué</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <ul className="space-y-3 p-4 md:hidden">
          {membres.map((m) => {
            const isU = user?.id === m.id;
            const inDemo = demoUsers.some((d) => d.id === m.id);
            const estInvite = m.source === 'invité' || (typeof m.id === 'string' && m.id.startsWith('inv-'));
            return (
              <li
                key={m.id}
                className="overflow-hidden rounded-xl border border-light-gray bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-light-gray bg-off-white text-sm font-semibold text-navy">
                    {m.prenom[0]}
                    {m.nom[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">
                      {m.grade} {m.prenom} {m.nom}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-text-light">{m.email}</p>
                    <p className="mt-1 text-xs text-text-light">{FONCTION_LABEL[m.fonction]}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(m.habilitations || []).map((h) => {
                        const def = HAB_LABELS[h] ?? { label: h, tone: 'neutral' };
                        return (
                          <Badge key={h} tone={def.tone}>
                            {def.label}
                          </Badge>
                        );
                      })}
                    </div>
                    {inDemo && !isU && (
                      <Button
                        type="button"
                        className="mt-3 w-full"
                        size="sm"
                        variant="secondary"
                        onClick={() => login(m.fonction)}
                      >
                        Se connecter en tant que
                      </Button>
                    )}
                    {inDemo && isU && (
                      <p className="mt-2 text-xs text-brand-green">Compte actif (vous)</p>
                    )}
                    {estInvite && (
                      <p className="mt-2 text-xs text-amber-800">Compte créé (invitation) — en attente 1ʳᵉ connexion</p>
                    )}
                    {!inDemo && !estInvite && <p className="mt-2 text-xs text-text-light">Membre d’appui (habilitations figées)</p>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        </Card>
      </div>

      <InviteMembreModal
        open={inviteOuvert}
        onClose={() => setInviteOuvert(false)}
        onCompteCree={ajouterCompte}
        fonctionCreateur={user?.fonction ?? FONCTIONS.TERRAIN}
      />
    </>
  );
}
