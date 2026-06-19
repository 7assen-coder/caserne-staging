import { useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import SelectField from '../common/SelectField';
import EquipementPdfUpload from '../equipement/EquipementPdfUpload';
import {
  JOURNAL_TYPES,
  buildJournalCode,
  nextJournalSeq,
} from '../../data/journalCatalog';

function emptyForm() {
  return {
    code: '',
    type: 'observation',
    date: new Date().toISOString().slice(0, 10),
    titre: '',
    contenu: '',
    auteur: '',
    pjFile: null,
  };
}

function formFromItem(item) {
  if (!item) return emptyForm();
  return {
    code: item.code ?? '',
    type: item.type ?? 'observation',
    date: item.date ?? new Date().toISOString().slice(0, 10),
    titre: item.titre ?? '',
    contenu: item.contenu ?? '',
    auteur: item.auteur ?? '',
    pjFile: null,
  };
}

export default function JournalItemForm({
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
    return buildJournalCode(form.type, nextJournalSeq(existingItems, form.type));
  }, [isEdit, form.code, form.type, existingItems]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const titre = form.titre.trim();
    const contenu = form.contenu.trim();
    if (!titre) {
      setError('Le titre est obligatoire.');
      return;
    }
    if (!contenu) {
      setError('Le contenu est obligatoire.');
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
          date: form.date,
          titre,
          contenu,
          auteur: form.auteur.trim(),
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
      title={isEdit ? 'Modifier l’entrée' : 'Nouvelle entrée'}
      subtitle="Journal de vie scolaire — observation, incident ou entretien"
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={handleClose} disabled={busy}>
            Annuler
          </Button>
          <Button type="submit" form="journal-form" variant="primary" disabled={busy}>
            {busy ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </>
      }
    >
      <form id="journal-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField
            label="Type"
            value={form.type}
            onChange={(v) => setForm((f) => ({ ...f, type: v }))}
            options={JOURNAL_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          />
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Date</span>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
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
          <span className="mb-1 block font-medium text-slate-700">Titre</span>
          <input
            type="text"
            value={form.titre}
            onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))}
            className="input w-full"
            placeholder="Objet court de l’entrée…"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Contenu</span>
          <textarea
            value={form.contenu}
            onChange={(e) => setForm((f) => ({ ...f, contenu: e.target.value }))}
            rows={4}
            className="input w-full resize-y"
            placeholder="Compte-rendu, observation ou suite à donner…"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Auteur / encadrant</span>
          <input
            type="text"
            value={form.auteur}
            onChange={(e) => setForm((f) => ({ ...f, auteur: e.target.value }))}
            className="input w-full"
            placeholder="Nom du superviseur ou du rédacteur"
          />
        </label>

        <EquipementPdfUpload
          label="Pièce jointe PDF"
          hint="PDF uniquement · max 5 Mo"
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
