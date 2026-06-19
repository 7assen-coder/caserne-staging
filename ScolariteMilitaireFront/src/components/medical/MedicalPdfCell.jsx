import { useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import {
  MAX_EQUIPEMENT_PDF_SIZE,
  validateUploadFile,
} from '../../utils/fileValidation';

/** Cellule PDF pour une consultation médicale. */
export default function MedicalPdfCell({
  attachment,
  canEdit,
  onUpload,
  uploading,
  onError,
  label = 'PDF',
}) {
  const inputRef = useRef(null);

  const handlePick = async (file) => {
    if (!file) return;
    const result = await validateUploadFile(file, 'document', {
      pdfOnly: true,
      maxSize: MAX_EQUIPEMENT_PDF_SIZE,
    });
    if (!result.ok) {
      onError?.(result.message);
      return;
    }
    await onUpload(file);
  };

  return (
    <div className="flex min-w-[5rem] flex-col gap-1">
      {attachment ? (
        <a
          href={attachment.dataUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-navy hover:underline"
        >
          <FileText size={13} aria-hidden />
          Voir
        </a>
      ) : (
        <span className="text-xs text-slate-400">—</span>
      )}
      {canEdit ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (inputRef.current) inputRef.current.value = '';
              if (file) await handlePick(file);
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="text-left text-[10px] font-semibold text-gold hover:underline disabled:opacity-50"
          >
            {uploading ? '…' : attachment ? `Remplacer ${label}` : `Joindre ${label}`}
          </button>
        </>
      ) : null}
    </div>
  );
}
