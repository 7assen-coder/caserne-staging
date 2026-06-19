import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Package,
  PackageCheck,
  PackageOpen,
  PackagePlus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import Button from '../common/Button';
import EquipementItemForm from './EquipementItemForm';
import EquipementItemPdfCell from './EquipementItemPdfCell';
import { equipementEtatLabel } from '../../data/equipementCatalog';
import { equipementService } from '../../services/equipementService';
import { downloadEquipementFichePdf } from '../../utils/equipementFichePdf';
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

function EtatBadge({ etat }) {
  const rendu = etat === 'rendu';
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        rendu
          ? 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
          : 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
      }`}
    >
      {equipementEtatLabel(etat)}
    </span>
  );
}

function MiniStat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-light-gray/80 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-0.5 font-serif text-xl font-semibold tabular-nums text-navy">{value}</p>
        </div>
        {Icon ? <Icon size={18} className="text-esp-green/70" aria-hidden /> : null}
      </div>
    </div>
  );
}

export default function EquipementFicheView({
  dossier,
  loading,
  onBack,
  onRefresh,
  canEdit = true,
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const [pdfBusyId, setPdfBusyId] = useState(null);

  const eleve = dossier;
  const items = useMemo(() => dossier?.items ?? [], [dossier?.items]);
  const nomComplet = `${eleve?.prenom ?? ''} ${eleve?.nom ?? ''}`.trim();

  const itemStats = useMemo(() => {
    const enUsage = items.filter((i) => i.etat !== 'rendu').length;
    return { total: items.length, enUsage, rendu: items.length - enUsage };
  }, [items]);

  const handleAdd = async (payload, pdfFile) => {
    setBusy('add');
    try {
      await equipementService.addItem(eleve.id, payload, pdfFile);
      toast.success('Équipement ajouté.');
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
        title: 'Supprimer cet équipement ?',
        message: `${item.code} — ${item.description} sera retiré du dossier.`,
        confirmLabel: 'Supprimer',
        cancelLabel: 'Annuler',
        variant: 'danger',
      });
      if (!ok) return;
      setBusy(item.id);
      try {
        equipementService.deleteItem(item.id);
        toast.success('Équipement supprimé.');
        await onRefresh?.();
      } catch (err) {
        toast.error(humanizeError(err));
      } finally {
        setBusy(null);
      }
    },
    [confirm, toast, onRefresh],
  );

  const handleReturn = useCallback(
    async (item) => {
      const ok = await confirm({
        title: 'Marquer comme rendu ?',
        message: `Confirmer le retour de « ${item.description} ».`,
        confirmLabel: 'Confirmer le retour',
        cancelLabel: 'Annuler',
        variant: 'primary',
      });
      if (!ok) return;
      setBusy(item.id);
      try {
        equipementService.returnItem(item.id);
        toast.success('Équipement marqué comme rendu.');
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
    setPdfBusyId(itemId);
    try {
      await equipementService.updateItemPdf(itemId, file);
      toast.success(file ? 'PDF enregistré.' : 'Pièce jointe retirée.');
      await onRefresh?.();
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setPdfBusyId(null);
    }
  };

  const handleExportPdf = async () => {
    try {
      setBusy('pdf');
      await downloadEquipementFichePdf(eleve, items);
      toast.success('Fiche équipement téléchargée.');
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setBusy(null);
    }
  };

  if (loading && !eleve?.id) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
        Chargement du dossier équipement…
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

      {/* Hero dossier */}
      <section className="overflow-hidden rounded-2xl border border-light-gray bg-white shadow-sm">
        <div className="h-1.5 bg-gradient-to-r from-navy via-esp-green to-gold" />
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
              <p className="text-[10px] font-bold uppercase tracking-widest text-esp-green">
                Dossier équipement
              </p>
              <h1 className="truncate font-serif text-2xl font-semibold text-slate-900 sm:text-3xl">
                {nomComplet || '—'}
              </h1>
              <p className="mt-1 font-mono text-sm text-gold">{eleve?.matricule}</p>
              <p className="mt-1 text-sm text-slate-500">
                Section {eleve?.section || '—'} · ID {eleve?.id}
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
              <Button type="button" variant="primary" onClick={() => setAddOpen(true)}>
                <PackagePlus size={16} className="mr-1.5" aria-hidden />
                Remettre un équipement
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 border-t border-light-gray bg-off-white/40 px-5 py-4 sm:px-7">
          <MiniStat label="Total" value={itemStats.total} icon={Package} />
          <MiniStat label="En usage" value={itemStats.enUsage} icon={PackageOpen} />
          <MiniStat label="Rendu" value={itemStats.rendu} icon={PackageCheck} />
        </div>
      </section>

      {/* Inventaire */}
      <section className="overflow-hidden rounded-2xl border border-light-gray bg-white shadow-sm">
        <div className="border-b border-light-gray px-5 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-navy">Inventaire</h2>
          <p className="text-xs text-text-light">Codes, remises, retours et pièces jointes PDF</p>
        </div>

        {items.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Package size={36} className="mx-auto text-slate-300" aria-hidden />
            <p className="mt-3 text-sm text-slate-600">Aucune pièce enregistrée pour cet étudiant.</p>
            {canEdit ? (
              <Button type="button" variant="primary" className="mt-4" onClick={() => setAddOpen(true)}>
                <PackagePlus size={16} className="mr-1.5" aria-hidden />
                Première remise
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            {/* Mobile : cartes */}
            <ul className="divide-y divide-slate-100 lg:hidden">
              {items.map((item) => (
                <li key={item.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-gold">{item.code}</p>
                      <p className="mt-0.5 font-semibold text-slate-900">{item.description}</p>
                      <p className="text-xs text-slate-500">{item.type || '—'} · Qté {item.quantite ?? 1}</p>
                    </div>
                    <EtatBadge etat={item.etat} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-slate-400">Remise</dt>
                      <dd className="font-medium">{formatDate(item.dateRemise)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Retour</dt>
                      <dd className="font-medium">{formatDate(item.dateRetour)}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <EquipementItemPdfCell
                      item={item}
                      canEdit={canEdit}
                      uploading={pdfBusyId === item.id}
                      onError={(msg) => toast.error(msg)}
                      onUpload={(file) => handlePdfUpdate(item.id, file)}
                    />
                    {canEdit ? (
                      <div className="flex gap-1">
                        {item.etat !== 'rendu' ? (
                          <button
                            type="button"
                            title="Rendre"
                            disabled={busy === item.id}
                            onClick={() => handleReturn(item)}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-700"
                          >
                            <RotateCcw size={16} aria-hidden />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          title="Supprimer"
                          disabled={busy === item.id}
                          onClick={() => handleDelete(item)}
                          className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600"
                        >
                          <Trash2 size={16} aria-hidden />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop : tableau */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-light-gray bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Qté</th>
                    <th className="px-4 py-3">Remise</th>
                    <th className="px-4 py-3">État</th>
                    <th className="px-4 py-3">Retour</th>
                    <th className="px-4 py-3">PDF</th>
                    {canEdit ? <th className="px-4 py-3 text-right">Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono text-xs text-navy">{item.code}</td>
                      <td className="px-4 py-3 text-slate-600">{item.type || '—'}</td>
                      <td className="max-w-[14rem] px-4 py-3 font-medium text-slate-900">{item.description}</td>
                      <td className="px-4 py-3 tabular-nums">{item.quantite ?? 1}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatDate(item.dateRemise)}</td>
                      <td className="px-4 py-3">
                        <EtatBadge etat={item.etat} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">{formatDate(item.dateRetour)}</td>
                      <td className="px-4 py-3">
                        <EquipementItemPdfCell
                          item={item}
                          canEdit={canEdit}
                          uploading={pdfBusyId === item.id}
                          onError={(msg) => toast.error(msg)}
                          onUpload={(file) => handlePdfUpdate(item.id, file)}
                        />
                      </td>
                      {canEdit ? (
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            {item.etat !== 'rendu' ? (
                              <button
                                type="button"
                                title="Marquer comme rendu"
                                disabled={busy === item.id}
                                onClick={() => handleReturn(item)}
                                className="rounded-lg p-2 text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                              >
                                <RotateCcw size={16} aria-hidden />
                              </button>
                            ) : null}
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

      {addOpen ? (
        <EquipementItemForm
          open
          onClose={() => setAddOpen(false)}
          onSubmit={handleAdd}
          busy={busy === 'add'}
        />
      ) : null}
    </div>
  );
}
