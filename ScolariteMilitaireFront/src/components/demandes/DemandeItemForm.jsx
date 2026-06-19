import { useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import SelectField from '../common/SelectField';
import EquipementPdfUpload from '../equipement/EquipementPdfUpload';
import {
  DEMANDE_NATURES,
  DEMANDE_STATUTS,
  buildDemandeCode,
  nextDemandeSeq,
} from '../../data/demandeCatalog';

function emptyForm() {
  return {
    code: '',
    description: '',
    nature: 'permission_sortie',
    dateDepot: new Date().toISOString().slice(0, 10),
    statut: 'en_cours',
    demandeFile: null,
    pjFile: null,
  };
}

function formFromItem(item) {
  if (!item) return emptyForm();
  return {
    code: item.code ?? '',
    description: item.description ?? '',
    nature: item.nature ?? 'permission_sortie',
    dateDepot: item.dateDepot ?? new Date().toISOString().slice(0, 10),
    statut: item.statut ?? 'en_cours',
    demandeFile: null,
    pjFile: null,
  };
}

export default function DemandeItemForm({
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
    return buildDemandeCode(form.nature, nextDemandeSeq(existingItems, form.nature));
  }, [isEdit, form.code, form.nature, existingItems]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const description = form.description.trim();
    if (!description) {
      setError('La description est obligatoire.');
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
          description,
          nature: form.nature,
          dateDepot: form.dateDepot,
          statut: form.statut,
        },
        { demandeFile: form.demandeFile, pjFile: form.pjFile },
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
      title={isEdit ? 'Modifier la demande' : 'Nouvelle demande'}
      subtitle="Permission, autorisation ou demande administrative"
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={handleClose} disabled={busy}>
            Annuler
          </Button>
          <Button type="submit" form="demande-form" variant="primary" disabled={busy}>
            {busy ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </>
      }
    >
      <form id="demande-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField
            label="Nature"
            value={form.nature}
            onChange={(v) => setForm((f) => ({ ...f, nature: v }))}
            options={DEMANDE_NATURES.map((n) => ({ value: n.value, label: n.label }))}
          />
          <SelectField
            label="Statut"
            value={form.statut}
            onChange={(v) => setForm((f) => ({ ...f, statut: v }))}
            options={DEMANDE_STATUTS.map((s) => ({ value: s.value, label: s.label }))}
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
          <span className="mb-1 block font-medium text-slate-700">Description</span>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            className="input w-full resize-y"
            placeholder="Objet de la demande…"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Date de dépôt</span>
          <input
            type="date"
            value={form.dateDepot}
            onChange={(e) => setForm((f) => ({ ...f, dateDepot: e.target.value }))}
            className="input w-full"
          />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <EquipementPdfUpload
            label="Formulaire demande (PDF)"
            value={form.demandeFile ?? initialItem?.demandePdf ?? null}
            onChange={(demandeFile) => setForm((f) => ({ ...f, demandeFile }))}
          />
          <EquipementPdfUpload
            label="Pièce justificative (PDF)"
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
