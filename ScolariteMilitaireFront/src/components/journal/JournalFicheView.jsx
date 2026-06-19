import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  Pencil,
  Trash2,
} from 'lucide-react';
import Button from '../common/Button';
import JournalItemForm from './JournalItemForm';
import JournalPdfCell from './JournalPdfCell';
import JournalTypeBadge from './JournalTypeBadge';
import { journalService } from '../../services/journalService';
import { initials } from '../../utils/formatters';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { humanizeError } from '../../utils/apiErrors';

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return iso;
  }
}

function MiniStat({ label, value, accent }) {
  const accents = {
    navy: 'text-navy',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
  };
  return (
    <div className="rounded-xl border border-light-gray/80 bg-white px-4 py-3 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-0.5 font-serif text-xl font-semibold tabular-nums ${accents[accent] ?? accents.navy}`}>
        {value}
      </p>
    </div>
  );
}

export default function JournalFicheView({
  dossier,
  loading,
  onBack,
  onRefresh,
  canEdit = true,
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [busy, setBusy] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(null);

  const eleve = dossier;
  const entrees = useMemo(() => dossier?.entrees ?? [], [dossier?.entrees]);
  const nomComplet = `${eleve?.prenom ?? ''} ${eleve?.nom ?? ''}`.trim();

  const stats = useMemo(() => {
    const incidents = entrees.filter((e) => e.type === 'incident').length;
    const felicitations = entrees.filter((e) => e.type === 'felicitation').length;
    return { total: entrees.length, incidents, felicitations };
  }, [entrees]);

  const handleAdd = async (payload, files) => {
    setBusy('add');
    try {
      await journalService.addEntry(eleve.id, payload, files);
      toast.success('Entrée ajoutée au journal.');
      await onRefresh?.();
    } catch (err) {
      toast.error(humanizeError(err));
      throw err;
    } finally {
      setBusy(null);
    }
  };

  const handleEdit = async (payload, files) => {
    if (!editItem?.id) return;
    setBusy('edit');
    try {
      await journalService.updateEntry(editItem.id, payload, files);
      toast.success('Entrée mise à jour.');
      setEditItem(null);
      await onRefresh?.();
    } catch (err) {
      toast.error(humanizeError(err));
      throw err;
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = useCallback(
    async (item) => {
      const ok = await confirm({
        title: 'Supprimer cette entrée ?',
        message: `${item.code} — ${item.titre} sera retirée du journal.`,
        confirmLabel: 'Supprimer',
        cancelLabel: 'Annuler',
        variant: 'danger',
      });
      if (!ok) return;
      setBusy(item.id);
      try {
        journalService.deleteEntry(item.id);
        toast.success('Entrée supprimée.');
        await onRefresh?.();
      } catch (err) {
        toast.error(humanizeError(err));
      } finally {
        setBusy(null);
      }
    },
    [confirm, toast, onRefresh],
  );

  const handlePdfUpdate = async (itemId, file) => {
    setPdfBusy(itemId);
    try {
      await journalService.updateEntryPdf(itemId, file);
      toast.success('PDF enregistré.');
      await onRefresh?.();
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setPdfBusy(null);
    }
  };

  if (loading && !eleve?.id) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
        Chargement du journal…
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-8">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-navy"
      >
        <ArrowLeft size={16} aria-hidden />
        Retour au registre
      </button>

      <section className="overflow-hidden rounded-2xl border border-light-gray bg-white shadow-sm">
        <div className="h-1.5 bg-gradient-to-r from-navy via-sky-600 to-gold" />
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-7">
          <div className="flex min-w-0 gap-4">
            {eleve?.photoUrl ? (
              <img
                src={eleve.photoUrl}
                alt=""
                className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-2 ring-slate-100 shadow-sm"
              />
            ) : (
              <span className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-navy text-xl font-bold text-white shadow-md">
                {initials(eleve?.nom, eleve?.prenom)}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-sky-700">
                Journal de vie scolaire
              </p>
              <h1 className="truncate font-serif text-2xl font-semibold text-slate-900 sm:text-3xl">
                {nomComplet || '—'}
              </h1>
              <p className="mt-1 font-mono text-sm text-gold">{eleve?.matricule}</p>
              <p className="mt-1 text-sm text-slate-500">
                {eleve?.departement || '—'} · {eleve?.niveau || '—'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/eleves/dossiers"
              state={{ openEleveId: eleve?.id }}
              className="btn btn-secondary inline-flex items-center gap-2"
            >
              <ExternalLink size={16} aria-hidden />
              Dossier étudiant
            </Link>
            {canEdit ? (
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setEditItem(null);
                  setFormOpen(true);
                }}
              >
                <BookOpen size={16} className="mr-1.5" aria-hidden />
                Nouvelle entrée
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 border-t border-light-gray bg-off-white/40 px-5 py-4 sm:px-7">
          <MiniStat label="Total entrées" value={stats.total} accent="navy" />
          <MiniStat label="Incidents" value={stats.incidents} accent="amber" />
          <MiniStat label="Félicitations" value={stats.felicitations} accent="emerald" />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-light-gray bg-white shadow-sm">
        <div className="border-b border-light-gray px-5 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-navy">Chronologie</h2>
          <p className="text-xs text-text-light">Observations, incidents et entretiens d’encadrement</p>
        </div>

        {entrees.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <BookOpen size={36} className="mx-auto text-slate-300" aria-hidden />
            <p className="mt-3 text-sm text-slate-600">Aucune entrée enregistrée pour cet étudiant.</p>
            {canEdit ? (
              <Button
                type="button"
                variant="primary"
                className="mt-4"
                onClick={() => setFormOpen(true)}
              >
                Première entrée
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <ul className="divide-y divide-slate-100 lg:hidden">
              {entrees.map((item) => (
                <li key={item.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-gold">{item.code}</p>
                      <p className="mt-0.5 font-semibold text-slate-900">{item.titre}</p>
                      <p className="mt-1 text-xs text-slate-600">{item.contenu}</p>
                    </div>
                    <JournalTypeBadge type={item.type} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-slate-400">Date</dt>
                      <dd className="font-medium">{formatDate(item.date)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Auteur</dt>
                      <dd className="font-medium">{item.auteur || '—'}</dd>
                    </div>
                  </dl>
                  <div className="mt-3">
                    <JournalPdfCell
                      attachment={item.pjPdf}
                      canEdit={canEdit}
                      uploading={pdfBusy === item.id}
                      onError={(msg) => toast.error(msg)}
                      onUpload={(file) => handlePdfUpdate(item.id, file)}
                    />
                  </div>
                  {canEdit ? (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={busy === item.id}
                        onClick={() => {
                          setEditItem(item);
                          setFormOpen(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-navy"
                      >
                        <Pencil size={14} aria-hidden />
                        Modifier
                      </button>
                      <button
                        type="button"
                        disabled={busy === item.id}
                        onClick={() => handleDelete(item)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-600"
                      >
                        <Trash2 size={14} aria-hidden />
                        Supprimer
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead>
                  <tr className="border-b border-light-gray bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Titre</th>
                    <th className="px-4 py-3">Contenu</th>
                    <th className="px-4 py-3">Auteur</th>
                    <th className="px-4 py-3">PJ</th>
                    {canEdit ? <th className="px-4 py-3 text-right">Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {entrees.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono text-xs text-navy">{item.code}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatDate(item.date)}</td>
                      <td className="px-4 py-3">
                        <JournalTypeBadge type={item.type} />
                      </td>
                      <td className="max-w-[10rem] px-4 py-3 font-medium text-slate-900">{item.titre}</td>
                      <td className="max-w-[14rem] px-4 py-3 text-slate-600">{item.contenu}</td>
                      <td className="px-4 py-3 text-slate-600">{item.auteur || '—'}</td>
                      <td className="px-4 py-3">
                        <JournalPdfCell
                          attachment={item.pjPdf}
                          canEdit={canEdit}
                          uploading={pdfBusy === item.id}
                          onError={(msg) => toast.error(msg)}
                          onUpload={(file) => handlePdfUpdate(item.id, file)}
                        />
                      </td>
                      {canEdit ? (
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              title="Modifier"
                              disabled={busy === item.id}
                              onClick={() => {
                                setEditItem(item);
                                setFormOpen(true);
                              }}
                              className="rounded-lg p-2 text-navy transition hover:bg-slate-100 disabled:opacity-50"
                            >
                              <Pencil size={16} aria-hidden />
                            </button>
                            <button
                              type="button"
                              title="Supprimer"
                              disabled={busy === item.id}
                              onClick={() => handleDelete(item)}
                              className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              <Trash2 size={16} aria-hidden />
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {formOpen ? (
        <JournalItemForm
          open
          initialItem={editItem}
          existingItems={entrees}
          onClose={() => {
            setFormOpen(false);
            setEditItem(null);
          }}
          onSubmit={editItem ? handleEdit : handleAdd}
          busy={busy === 'add' || busy === 'edit'}
        />
      ) : null}
    </div>
  );
}
