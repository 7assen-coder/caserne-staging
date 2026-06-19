import { useEffect, useRef, useState } from 'react';
import { Camera, FileText, Save } from 'lucide-react';
import Button from '../common/Button';
import EquipementPdfUpload from '../equipement/EquipementPdfUpload';
import {
  MAX_EQUIPEMENT_PDF_SIZE,
  validateUploadFile,
} from '../../utils/fileValidation';

export default function MedicalProfileBlock({
  profile,
  groupeSanguin = '',
  canEdit = true,
  busy = false,
  onSave,
}) {
  const photoRef = useRef(null);
  const [maladiesChroniques, setMaladiesChroniques] = useState(profile?.maladiesChroniques ?? '');
  const [medicaments, setMedicaments] = useState(profile?.medicaments ?? '');
  const [dossierFile, setDossierFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoError, setPhotoError] = useState('');

  useEffect(() => {
    setMaladiesChroniques(profile?.maladiesChroniques ?? '');
    setMedicaments(profile?.medicaments ?? '');
    setDossierFile(null);
    setPhotoFile(null);
  }, [profile?.maladiesChroniques, profile?.medicaments, profile?.updatedAt]);

  const photoSrc =
    photoFile instanceof File
      ? URL.createObjectURL(photoFile)
      : profile?.photoMedicale?.dataUrl ?? null;

  const handlePhotoPick = async (file) => {
    setPhotoError('');
    if (!file) {
      setPhotoFile(null);
      return;
    }
    const result = await validateUploadFile(file, 'photo', {
      maxSize: MAX_EQUIPEMENT_PDF_SIZE,
    });
    if (!result.ok) {
      setPhotoError(result.message);
      return;
    }
    setPhotoFile(file);
  };

  const handleSave = () => {
    onSave?.(
      { maladiesChroniques: maladiesChroniques.trim(), medicaments: medicaments.trim() },
      { dossierFile, photoFile },
    );
    setDossierFile(null);
    setPhotoFile(null);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-light-gray bg-white shadow-sm">
      <div className="border-b border-light-gray px-5 py-4 sm:px-6">
        <h2 className="text-sm font-semibold text-navy">Informations médicales</h2>
        <p className="text-xs text-text-light">
          Groupe sanguin (dossier) · maladies chroniques · médicaments · pièces
        </p>
      </div>

      <div className="grid gap-6 p-5 sm:grid-cols-[auto_1fr] sm:p-6">
        <div className="flex flex-col items-center gap-3">
          {photoSrc ? (
            <img
              src={photoSrc}
              alt=""
              className="h-28 w-28 rounded-2xl object-cover ring-2 ring-slate-100 shadow-sm"
            />
          ) : (
            <span className="grid h-28 w-28 place-items-center rounded-2xl bg-slate-100 text-slate-400">
              <Camera size={32} aria-hidden />
            </span>
          )}
          {canEdit ? (
            <>
              <input
                ref={photoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (photoRef.current) photoRef.current.value = '';
                  await handlePhotoPick(file);
                }}
              />
              <button
                type="button"
                onClick={() => photoRef.current?.click()}
                className="text-xs font-semibold text-gold hover:underline"
              >
                {photoSrc ? 'Changer la photo' : 'Ajouter une photo'}
              </button>
              {photoError ? (
                <p className="max-w-[10rem] text-center text-[11px] text-red-600">{photoError}</p>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-light-gray bg-slate-50/60 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Groupe sanguin</p>
            <p className="mt-1 font-serif text-xl font-semibold text-navy">{groupeSanguin || '—'}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">Modifiable depuis le dossier étudiant</p>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Maladies chroniques</span>
            <textarea
              value={maladiesChroniques}
              onChange={(e) => setMaladiesChroniques(e.target.value)}
              readOnly={!canEdit}
              rows={2}
              className="input w-full resize-y read-only:bg-slate-50"
              placeholder="Asthme, allergies sévères…"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Médicaments à vie</span>
            <textarea
              value={medicaments}
              onChange={(e) => setMedicaments(e.target.value)}
              readOnly={!canEdit}
              rows={2}
              className="input w-full resize-y read-only:bg-slate-50"
              placeholder="Traitements permanents…"
            />
          </label>

          {canEdit ? (
            <EquipementPdfUpload
              label="Dossier médical (PDF)"
              value={dossierFile ?? profile?.dossierMedicalPdf ?? null}
              onChange={setDossierFile}
            />
          ) : profile?.dossierMedicalPdf ? (
            <a
              href={profile.dossierMedicalPdf.dataUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-navy hover:underline"
            >
              <FileText size={14} aria-hidden />
              Voir le dossier médical
            </a>
          ) : (
            <p className="text-xs text-slate-400">Aucun dossier médical</p>
          )}

          {canEdit && profile?.dossierMedicalPdf && !dossierFile ? (
            <a
              href={profile.dossierMedicalPdf.dataUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-navy hover:underline"
            >
              <FileText size={14} aria-hidden />
              Voir le dossier médical actuel
            </a>
          ) : null}

          {canEdit ? (
            <Button type="button" variant="secondary" onClick={handleSave} disabled={busy}>
              <Save size={16} className="mr-1.5" aria-hidden />
              {busy ? 'Enregistrement…' : 'Enregistrer le profil médical'}
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
