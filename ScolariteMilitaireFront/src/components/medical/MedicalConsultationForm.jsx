import { useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import SelectField from '../common/SelectField';
import EquipementPdfUpload from '../equipement/EquipementPdfUpload';
import {
  CONSULTATION_TYPES,
  buildConsultationCode,
  nextConsultationSeq,
} from '../../data/medicalCatalog';

function emptyForm() {
  return {
    code: '',
    type: 'consultation',
    motif: '',
    dateConsultation: new Date().toISOString().slice(0, 10),
    avisInfirmerie: '',
    pjFile: null,
  };
}

function formFromItem(item) {
  if (!item) return emptyForm();
  return {
    code: item.code ?? '',
    type: item.type ?? 'consultation',
    motif: item.motif ?? '',
    dateConsultation: item.dateConsultation ?? new Date().toISOString().slice(0, 10),
    avisInfirmerie: item.avisInfirmerie ?? '',
    pjFile: null,
  };
}

export default function MedicalConsultationForm({
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
    return buildConsultationCode(form.type, nextConsultationSeq(existingItems, form.type));
  }, [isEdit, form.code, form.type, existingItems]);

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
          type: form.type,
          motif,
          dateConsultation: form.dateConsultation,
          avisInfirmerie: form.avisInfirmerie.trim(),
        },
        { pjFile: form.pjFile },
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
      title={isEdit ? 'Modifier la consultation' : 'Nouvelle consultation'}
      subtitle="Consultation infirmerie ou incident médical"
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={handleClose} disabled={busy}>
            Annuler
          </Button>
          <Button type="submit" form="consultation-form" variant="primary" disabled={busy}>
            {busy ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </>
      }
    >
      <form id="consultation-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField
            label="Type"
            value={form.type}
            onChange={(v) => setForm((f) => ({ ...f, type: v }))}
            options={CONSULTATION_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          />
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Date</span>
            <input
              type="date"
              value={form.dateConsultation}
              onChange={(e) => setForm((f) => ({ ...f, dateConsultation: e.target.value }))}
              className="input w-full"
            />
          </label>
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
            rows={2}
            className="input w-full resize-y"
            placeholder="Motif de la consultation…"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Avis infirmerie</span>
          <textarea
            value={form.avisInfirmerie}
            onChange={(e) => setForm((f) => ({ ...f, avisInfirmerie: e.target.value }))}
            rows={3}
            className="input w-full resize-y"
            placeholder="Observations, traitement, recommandations…"
          />
        </label>

        <EquipementPdfUpload
          label="Pièce jointe (PDF)"
          value={form.pjFile ?? initialItem?.pjPdf ?? null}
          onChange={(pjFile) => setForm((f) => ({ ...f, pjFile }))}
        />

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
