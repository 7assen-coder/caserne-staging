import { useMemo, useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import SelectField from '../common/SelectField';
import EquipementPdfUpload from './EquipementPdfUpload';
import { EQUIPEMENT_CATALOG, buildEquipementCode } from '../../data/equipementCatalog';

function emptyForm() {
  return {
    catalogIndex: '',
    code: '',
    type: '',
    quantite: '1',
    dateRemise: new Date().toISOString().slice(0, 10),
    pdfFile: null,
  };
}

export default function EquipementItemForm({ open, onClose, onSubmit, busy = false }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const handleClose = () => {
    setForm(emptyForm());
    setError('');
    onClose();
  };

  const catalogOptions = [
    { value: '', label: '— Choisir dans le catalogue —' },
    ...EQUIPEMENT_CATALOG.map((item, i) => ({
      value: String(i),
      label: item.label,
    })),
    { value: 'custom', label: 'Saisie manuelle' },
  ];

  const selectedCatalog = useMemo(() => {
    if (!form.catalogIndex || form.catalogIndex === 'custom') return null;
    return EQUIPEMENT_CATALOG[Number(form.catalogIndex)] ?? null;
  }, [form.catalogIndex]);

  const generatedCode = useMemo(() => {
    if (!selectedCatalog) return '';
    return buildEquipementCode(selectedCatalog.baseCode, form.quantite);
  }, [selectedCatalog, form.quantite]);

  const handleCatalogChange = (value) => {
    if (value === 'custom' || value === '') {
      setForm((f) => ({
        ...f,
        catalogIndex: value,
        code: value === 'custom' ? f.code : '',
        type: value === 'custom' ? f.type : '',
      }));
      return;
    }
    const cat = EQUIPEMENT_CATALOG[Number(value)];
    if (!cat) return;
    const qte = String(cat.quantiteDefaut ?? 1);
    setForm((f) => ({
      ...f,
      catalogIndex: value,
      code: buildEquipementCode(cat.baseCode, qte),
      type: cat.type,
      quantite: qte,
    }));
  };

  const handleQuantiteChange = (value) => {
    setForm((f) => {
      const next = { ...f, quantite: value };
      const cat =
        f.catalogIndex && f.catalogIndex !== 'custom'
          ? EQUIPEMENT_CATALOG[Number(f.catalogIndex)]
          : null;
      if (cat) {
        next.code = buildEquipementCode(cat.baseCode, value);
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const finalCode = selectedCatalog
      ? buildEquipementCode(selectedCatalog.baseCode, form.quantite)
      : form.code.trim();

    if (!finalCode) {
      setError('Le code est obligatoire.');
      return;
    }
    const qte = Number(form.quantite);
    if (!Number.isFinite(qte) || qte < 1) {
      setError('La quantité doit être au moins 1.');
      return;
    }
    const description = selectedCatalog
      ? selectedCatalog.label
      : form.type.trim() || finalCode;

    if (!description) {
      setError('Le type / nature est obligatoire en saisie manuelle.');
      return;
    }

    try {
      await onSubmit({
        code: finalCode,
        type: form.type.trim() || selectedCatalog?.type || '',
        description,
        quantite: qte,
        dateRemise: form.dateRemise,
        etat: 'en_usage',
      }, form.pdfFile);
      handleClose();
    } catch (err) {
      setError(err.message || 'Erreur lors de l’ajout.');
    }
  };

  const isCustom = form.catalogIndex === 'custom';
  const fromCatalog = Boolean(selectedCatalog);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Ajouter un équipement"
      subtitle="Remise d'une pièce ou d'un lot au dossier étudiant"
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={handleClose} disabled={busy}>
            Annuler
          </Button>
          <Button type="submit" form="equipement-add-form" variant="primary" disabled={busy}>
            {busy ? 'Enregistrement…' : 'Ajouter'}
          </Button>
        </>
      }
    >
      <form id="equipement-add-form" onSubmit={handleSubmit} className="space-y-4">
        <SelectField
          label="Catalogue"
          value={form.catalogIndex}
          onChange={handleCatalogChange}
          options={catalogOptions}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Code</span>
            <input
              type="text"
              value={fromCatalog ? generatedCode : form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              disabled={fromCatalog}
              readOnly={fromCatalog}
              className="input w-full font-mono disabled:bg-slate-100"
              placeholder={isCustom ? 'Ex. GILET-PARE-Q1' : 'Choisir un article'}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Type / Nature</span>
            <input
              type="text"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              disabled={fromCatalog}
              className="input w-full disabled:bg-slate-100"
              placeholder="Tenue militaire"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Quantité</span>
            <input
              type="number"
              min={1}
              value={form.quantite}
              onChange={(e) => handleQuantiteChange(e.target.value)}
              className="input w-full"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Date de remise</span>
            <input
              type="date"
              value={form.dateRemise}
              onChange={(e) => setForm((f) => ({ ...f, dateRemise: e.target.value }))}
              className="input w-full"
            />
          </label>
        </div>

        {isCustom ? (
          <p className="text-xs text-slate-500">
            Saisie libre : utilisez un code explicite, par ex.{' '}
            <span className="font-mono">ARTICLE-Q1</span> pour indiquer l’article et la quantité.
          </p>
        ) : null}

        <EquipementPdfUpload
          value={form.pdfFile}
          onChange={(pdfFile) => setForm((f) => ({ ...f, pdfFile }))}
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
