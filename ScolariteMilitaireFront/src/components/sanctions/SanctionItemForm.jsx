import { useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import SelectField from '../common/SelectField';
import EquipementPdfUpload from '../equipement/EquipementPdfUpload';
import {
  SANCTION_NATURES,
  SANCTION_STATUTS,
  buildSanctionCode,
  nextSanctionSeqForEleve,
} from '../../data/sanctionCatalog';

function emptyForm() {
  return {
    code: '',
    motif: '',
    nature: 'avertissement',
    dateDebut: new Date().toISOString().slice(0, 10),
    dateFin: '',
    statut: 'en_cours',
    crFile: null,
    pjFile: null,
  };
}

function formFromItem(item) {
  if (!item) return emptyForm();
  return {
    code: item.code ?? '',
    motif: item.motif ?? '',
    nature: item.nature ?? 'avertissement',
    dateDebut: item.dateDebut ?? new Date().toISOString().slice(0, 10),
    dateFin: item.dateFin ?? '',
    statut: item.statut ?? 'en_cours',
    crFile: null,
    pjFile: null,
  };
}

export default function SanctionItemForm({
  open,
  onClose,
  onSubmit,
  busy = false,
  initialItem = null,
  existingItems = [],
}) {
  const isEdit = Boolean(initialItem?.id);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(formFromItem(initialItem));
      setError('');
    }
  }, [open, initialItem]);

  const handleClose = () => {
    setForm(emptyForm());
    setError('');
    onClose();
  };

  const suggestedCode = useMemo(() => {
    if (isEdit) return form.code;
    const seq = nextSanctionSeqForEleve(existingItems, form.nature);
    return buildSanctionCode(form.nature, seq);
  }, [isEdit, form.code, form.nature, existingItems]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const motif = form.motif.trim();
    if (!motif) {
      setError('Le motif est obligatoire.');
      return;
    }
    const code = (isEdit ? form.code : suggestedCode).trim();
    if (!code) {
      setError('Le code est obligatoire.');
      return;
    }

    try {
      await onSubmit(
        {
          code,
          motif,
          nature: form.nature,
          dateDebut: form.dateDebut,
          dateFin: form.dateFin || null,
          statut: form.statut,
        },
        { crFile: form.crFile, pjFile: form.pjFile },
      );
      handleClose();
    } catch (err) {
      setError(err.message || 'Erreur lors de l’enregistrement.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Modifier la sanction' : 'Ajouter une sanction'}
      subtitle="Enregistrement disciplinaire au dossier étudiant"
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={handleClose} disabled={busy}>
            Annuler
          </Button>
          <Button type="submit" form="sanction-form" variant="primary" disabled={busy}>
            {busy ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </>
      }
    >
      <form id="sanction-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField
            label="Nature"
            value={form.nature}
            onChange={(v) => setForm((f) => ({ ...f, nature: v }))}
            options={SANCTION_NATURES.map((n) => ({ value: n.value, label: n.label }))}
          />
          <SelectField
            label="Statut"
            value={form.statut}
            onChange={(v) => setForm((f) => ({ ...f, statut: v }))}
            options={SANCTION_STATUTS.map((s) => ({ value: s.value, label: s.label }))}
          />
        </div>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Code</span>
          <input
            type="text"
            value={isEdit ? form.code : suggestedCode}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            readOnly={!isEdit}
            disabled={!isEdit}
            className="input w-full font-mono disabled:bg-slate-100"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Motif</span>
          <textarea
            value={form.motif}
            onChange={(e) => setForm((f) => ({ ...f, motif: e.target.value }))}
            rows={3}
            className="input w-full resize-y"
            placeholder="Description du manquement ou de la faute…"
          />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Date de début</span>
            <input
              type="date"
              value={form.dateDebut}
              onChange={(e) => setForm((f) => ({ ...f, dateDebut: e.target.value }))}
              className="input w-full"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Date de fin</span>
            <input
              type="date"
              value={form.dateFin}
              onChange={(e) => setForm((f) => ({ ...f, dateFin: e.target.value }))}
              className="input w-full"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <EquipementPdfUpload
            label="Compte-rendu (CR) PDF"
            hint="PDF uniquement · max 5 Mo"
            value={form.crFile ?? initialItem?.crPdf ?? null}
            onChange={(crFile) => setForm((f) => ({ ...f, crFile }))}
          />
          <EquipementPdfUpload
            label="Pièce jointe (PJ) PDF"
            hint="PDF uniquement · max 5 Mo"
            value={form.pjFile ?? initialItem?.pjPdf ?? null}
            onChange={(pjFile) => setForm((f) => ({ ...f, pjFile }))}
          />
        </div>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
