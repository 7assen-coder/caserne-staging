import { useState } from 'react';
import {
  ArrowLeft,
  FileEdit,
  GraduationCap,
  Users,
  Phone,
  Home,
  IdCard,
} from 'lucide-react';
import Button from '../common/Button';
import { initials } from '../../utils/formatters';

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
  const s = c.scolarite ?? {};

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-light-gray bg-white px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button variant="secondary" size="sm" onClick={onBack} className="shrink-0">
              <ArrowLeft size={16} /> Retour à la liste
            </Button>
            <div className="h-6 w-px bg-light-gray" />
            <div className="min-w-0">
              <h1 className="truncate font-serif text-lg font-semibold text-slate-900 sm:text-xl">Fiche étudiant</h1>
              <p className="truncate text-xs text-slate-500 sm:text-sm">
                {c.prenom} {c.nom} · {c.matricule}
              </p>
              {loading && <p className="text-xs text-slate-400">Chargement des données complètes...</p>}
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={FileEdit}
              onClick={onEditDossier}
            >
              Modifier le dossier
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="w-full space-y-6 px-4 py-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
            <div className="lg:col-span-4">
              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-light-gray bg-white ring-1 ring-slate-100">
                <div className="relative w-full min-h-[280px] flex-1 sm:min-h-[320px]">
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
                  <p className="text-center font-mono text-[11px] text-slate-500">{c.matricule}</p>
                  <p className="text-center text-sm text-amber-800">{c.filiere}</p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {c.section && <span className="rounded-full bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy">{c.section}</span>}
                    {c.compagnie && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{c.compagnie}</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid min-h-0 content-start gap-6 lg:col-span-8">
              <Section title="Identité & parcours secondaire" icon={IdCard}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Item label="NNI" value={c.nni} />
                  <Item label="N° Bac" value={c.numeroBac} />
                  <Item label="Date / lieu de naissance" value={`${c.dateNaissance ?? '—'} · ${c.lieuNaissance ?? '—'}`} />
                  <Item label="Nationalité" value={c.nationalite} />
                  <Item label="Sexe" value={c.sexe === 'F' ? 'Féminin' : 'Masculin'} />
                  <Item label="Série Bac" value={c.serieBac} />
                  <Item label="Catégorie Bac" value={c.categorieBac} />
                  <Item label="École du Bac" value={c.ecoleBac} />
                  <Item label="Résident chez les parents" value={c.residentAvecParents} />
                  <Item label="Compte Bankily" value={c.compteBankily} />
                </div>
              </Section>

              <div className="grid gap-6 md:grid-cols-1">
                <Section title="Scolarité" icon={GraduationCap}>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Item label="Département" value={c.filiere ?? s.filiere} />
                    <Item label="Niveau" value={s.niveau} />
                    <Item label="Voie d’accès" value={s.voieAcces} />
                    <Item label="1ʳᵉ année universitaire" value={s.anneeUni1ere} />
                    <Item label="Diplôme d’accès" value={s.diplomeAcces} />
                    <Item label="Établissement (1er cycle)" value={s.etablissementPremierCycle} />
                  </div>
                </Section>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Section title="Famille" icon={Users}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Item label="Père" value={`${c.parents?.prenomPere ?? '—'} — ${c.parents?.fonctionPere ?? '—'}`} />
                <Item
                  label="Mère"
                  value={`${c.parents?.prenomMere ?? ''} ${c.parents?.nomMere ?? ''} — ${c.parents?.fonctionMere ?? '—'}`}
                />
              </div>
            </Section>
            <Section title="Contact" icon={Phone}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Item label="Tél. 1" value={c.contact?.telephone} />
                <Item label="Tél. 2 (WhatsApp)" value={c.contact?.tel2} />
                <Item label="E-mail institutionnel" value={c.contact?.emailPro ?? c.contact?.email} />
                <Item label="E-mail personnel" value={c.contact?.emailPerso} />
                <Item label="Adresse" value={c.contact?.adresse} className="sm:col-span-2 md:col-span-2" />
              </div>
            </Section>
          </div>

          <Section title="Hébergement" icon={Home}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
              <Item label="Bâtiment" value={c.hebergement?.batiment} />
              <Item label="Étage" value={c.hebergement?.etage} />
              <Item label="Aile" value={c.hebergement?.aile} />
              <Item label="Chambre" value={c.hebergement?.chambre} />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
