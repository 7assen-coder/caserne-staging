import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Pencil,
  Scale,
  Trash2,
} from 'lucide-react';
import Button from '../common/Button';
import SanctionItemForm from './SanctionItemForm';
import SanctionPdfCell from './SanctionPdfCell';
import SanctionStatutBadge from './SanctionStatutBadge';
import { sanctionNatureLabel } from '../../data/sanctionCatalog';
import { sanctionService } from '../../services/sanctionService';
import { downloadSanctionFichePdf } from '../../utils/sanctionFichePdf';
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
    amber: 'text-amber-700',
    slate: 'text-slate-600',
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

export default function SanctionsFicheView({
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
  const sanctions = useMemo(() => dossier?.sanctions ?? [], [dossier?.sanctions]);
  const nomComplet = `${eleve?.prenom ?? ''} ${eleve?.nom ?? ''}`.trim();

  const stats = useMemo(() => {
    const enCours = sanctions.filter((s) => s.statut === 'en_cours').length;
    const cloturees = sanctions.filter((s) => s.statut === 'cloturee').length;
    return { total: sanctions.length, enCours, cloturees };
  }, [sanctions]);

  const handleAdd = async (payload, files) => {
    setBusy('add');
    try {
      await sanctionService.addSanction(eleve.id, payload, files);
      toast.success('Sanction ajoutée.');
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
      await sanctionService.updateSanction(editItem.id, payload, files);
      toast.success('Sanction mise à jour.');
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
        title: 'Supprimer cette sanction ?',
        message: `${item.code} — ${item.motif} sera retirée du dossier.`,
        confirmLabel: 'Supprimer',
        cancelLabel: 'Annuler',
        variant: 'danger',
      });
      if (!ok) return;
      setBusy(item.id);
      try {
        sanctionService.deleteSanction(item.id);
        toast.success('Sanction supprimée.');
        await onRefresh?.();
      } catch (err) {
        toast.error(humanizeError(err));
      } finally {
        setBusy(null);
      }
    },
    [confirm, toast, onRefresh],
  );

  const handlePdfUpdate = async (itemId, field, file) => {
    setPdfBusy(`${itemId}-${field}`);
    try {
      await sanctionService.updateSanctionPdf(itemId, field, file);
      toast.success('PDF enregistré.');
      await onRefresh?.();
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setPdfBusy(null);
    }
  };

  const handleExportPdf = async () => {
    try {
      setBusy('pdf');
      await downloadSanctionFichePdf(eleve, sanctions);
      toast.success('Fiche sanctions téléchargée.');
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setBusy(null);
    }
  };

  if (loading && !eleve?.id) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
        Chargement du dossier sanctions…
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
        <div className="h-1.5 bg-gradient-to-r from-navy via-amber-600 to-gold" />
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
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
                Dossier sanctions
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
            <Button
              type="button"
              variant="secondary"
              onClick={handleExportPdf}
              disabled={busy === 'pdf'}
            >
              <Download size={16} className="mr-1.5" aria-hidden />
              {busy === 'pdf' ? 'Export…' : 'Fiche PDF'}
            </Button>
            {canEdit ? (
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setEditItem(null);
                  setFormOpen(true);
                }}
              >
                <Scale size={16} className="mr-1.5" aria-hidden />
                Ajouter une sanction
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 border-t border-light-gray bg-off-white/40 px-5 py-4 sm:px-7">
          <MiniStat label="Total" value={stats.total} accent="navy" />
          <MiniStat label="En cours" value={stats.enCours} accent="amber" />
          <MiniStat label="Clôturées" value={stats.cloturees} accent="slate" />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-light-gray bg-white shadow-sm">
        <div className="border-b border-light-gray px-5 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-navy">Historique disciplinaire</h2>
          <p className="text-xs text-text-light">Codes, motifs, comptes-rendus et pièces jointes</p>
        </div>

        {sanctions.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Scale size={36} className="mx-auto text-slate-300" aria-hidden />
            <p className="mt-3 text-sm text-slate-600">Aucune sanction enregistrée pour cet étudiant.</p>
            {canEdit ? (
              <Button
                type="button"
                variant="primary"
                className="mt-4"
                onClick={() => setFormOpen(true)}
              >
                Première sanction
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <ul className="divide-y divide-slate-100 lg:hidden">
              {sanctions.map((item) => (
                <li key={item.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-gold">{item.code}</p>
                      <p className="mt-0.5 font-semibold text-slate-900">{item.motif}</p>
                      <p className="text-xs text-slate-500">{sanctionNatureLabel(item.nature)}</p>
                    </div>
                    <SanctionStatutBadge statut={item.statut} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-slate-400">Début</dt>
                      <dd className="font-medium">{formatDate(item.dateDebut)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Fin</dt>
                      <dd className="font-medium">{formatDate(item.dateFin)}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-4">
                    <SanctionPdfCell
                      attachment={item.crPdf}
                      label="CR"
                      canEdit={canEdit}
                      uploading={pdfBusy === `${item.id}-crPdf`}
                      onError={(msg) => toast.error(msg)}
                      onUpload={(file) => handlePdfUpdate(item.id, 'crPdf', file)}
                    />
                    <SanctionPdfCell
                      attachment={item.pjPdf}
                      label="PJ"
                      canEdit={canEdit}
                      uploading={pdfBusy === `${item.id}-pjPdf`}
                      onError={(msg) => toast.error(msg)}
                      onUpload={(file) => handlePdfUpdate(item.id, 'pjPdf', file)}
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
                    <th className="px-4 py-3">Motif</th>
                    <th className="px-4 py-3">Nature</th>
                    <th className="px-4 py-3">Début</th>
                    <th className="px-4 py-3">Fin</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">CR</th>
                    <th className="px-4 py-3">PJ</th>
                    {canEdit ? <th className="px-4 py-3 text-right">Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {sanctions.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono text-xs text-navy">{item.code}</td>
                      <td className="max-w-[14rem] px-4 py-3 font-medium text-slate-900">{item.motif}</td>
                      <td className="px-4 py-3 text-slate-600">{sanctionNatureLabel(item.nature)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatDate(item.dateDebut)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatDate(item.dateFin)}</td>
                      <td className="px-4 py-3">
                        <SanctionStatutBadge statut={item.statut} />
                      </td>
                      <td className="px-4 py-3">
                        <SanctionPdfCell
                          attachment={item.crPdf}
                          label="CR"
                          canEdit={canEdit}
                          uploading={pdfBusy === `${item.id}-crPdf`}
                          onError={(msg) => toast.error(msg)}
                          onUpload={(file) => handlePdfUpdate(item.id, 'crPdf', file)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <SanctionPdfCell
                          attachment={item.pjPdf}
                          label="PJ"
                          canEdit={canEdit}
                          uploading={pdfBusy === `${item.id}-pjPdf`}
                          onUpload={(file) => handlePdfUpdate(item.id, 'pjPdf', file)}
                          onError={(msg) => toast.error(msg)}
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
        <SanctionItemForm
          open
          initialItem={editItem}
          existingItems={sanctions}
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
