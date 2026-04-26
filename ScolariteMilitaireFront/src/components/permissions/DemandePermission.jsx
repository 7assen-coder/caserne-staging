import { useState } from 'react';
import Button from '../common/Button';
import ImportDossier from '../eleves/ImportDossier';
import { useFetch } from '../../hooks/useFetch';
import { eleveService } from '../../services/eleveService';
import { TYPES_ABSENCE, MOTIFS_ABSENCE } from '../../utils/constants';

export default function DemandePermission({ onSubmit, onCancel }) {
  const { data: eleves } = useFetch(() => eleveService.list(), []);
  const [values, setValues] = useState({
    eleveId: '',
    typeAbsence: TYPES_ABSENCE[0].value,
    motif: MOTIFS_ABSENCE[0].value,
    dateDebut: '',
    dateFin: '',
    commentaire: '',
    justificatif: null,
  });

  const submit = async (e) => {
    e.preventDefault();
    const eleve = eleves?.find((x) => x.id === values.eleveId);
    if (!eleve) return;
    await onSubmit?.({
      ...values,
      eleveNom: `${eleve.nom} ${eleve.prenom}`,
      matricule: eleve.matricule,
      section: eleve.section,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block md:col-span-2">
          <span className="label">Élève concerné *</span>
          <select
            required
            className="input"
            value={values.eleveId}
            onChange={(e) => setValues({ ...values, eleveId: e.target.value })}
          >
            <option value="">— Sélectionner —</option>
            {(eleves ?? []).slice(0, 50).map((e) => (
              <option key={e.id} value={e.id}>
                {e.nom} {e.prenom} ({e.matricule} · {e.section})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label">Type d'absence *</span>
          <select
            className="input"
            value={values.typeAbsence}
            onChange={(e) => setValues({ ...values, typeAbsence: e.target.value })}
          >
            {TYPES_ABSENCE.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label">Motif *</span>
          <select
            className="input"
            value={values.motif}
            onChange={(e) => setValues({ ...values, motif: e.target.value })}
          >
            {MOTIFS_ABSENCE.filter((m) =>
              ['medical', 'social', 'familial', 'administratif'].includes(m.value),
            ).map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label">Date de début *</span>
          <input
            type="date"
            required
            className="input"
            value={values.dateDebut}
            onChange={(e) => setValues({ ...values, dateDebut: e.target.value })}
          />
        </label>

        <label className="block">
          <span className="label">Date de fin *</span>
          <input
            type="date"
            required
            className="input"
            value={values.dateFin}
            onChange={(e) => setValues({ ...values, dateFin: e.target.value })}
          />
        </label>

        <label className="block md:col-span-2">
          <span className="label">Commentaire</span>
          <textarea
            rows={3}
            className="input"
            placeholder="Précisions sur la demande…"
            value={values.commentaire}
            onChange={(e) => setValues({ ...values, commentaire: e.target.value })}
          />
        </label>
      </div>

      <div>
        <p className="label">Pièce justificative</p>
        <p className="text-xs text-text-light mb-2">
          Certificat médical, reçu d'engagement, convocation…
        </p>
        <ImportDossier
          onUpload={(files) =>
            setValues((v) => ({ ...v, justificatif: files[0] ?? v.justificatif }))
          }
        />
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" variant="primary">
          Soumettre la demande
        </Button>
      </div>
    </form>
  );
}
