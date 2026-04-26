import { useRef, useState } from 'react';
import { UploadCloud, FileText, ImageIcon, Trash2 } from 'lucide-react';
import Button from '../common/Button';

export default function ImportDossier({ onUpload }) {
  const ref = useRef(null);
  const [files, setFiles] = useState([]);

  const addFiles = (list) => {
    const next = Array.from(list).map((f) => ({
      id: `${f.name}-${f.size}-${Date.now()}`,
      nom: f.name,
      taille: f.size,
      type: f.type.startsWith('image/') ? 'image' : f.type === 'application/pdf' ? 'pdf' : 'autre',
    }));
    setFiles((prev) => [...prev, ...next]);
    onUpload?.(next);
  };

  return (
    <div>
      <div
        onClick={() => ref.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
        className="cursor-pointer rounded-md border-2 border-dashed border-white/20 p-6 text-center transition hover:border-gold/50 hover:bg-white/5"
      >
        <UploadCloud size={28} className="mx-auto text-slate-400" />
        <p className="mt-2 text-sm text-slate-200">
          Glisser-déposer des fichiers ici ou <span className="text-gold underline">parcourir</span>
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Photos, CIN, diplômes — JPG, PNG, PDF
        </p>
        <input
          ref={ref}
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="mt-4 divide-y divide-white/10 rounded-md border border-white/10">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-4 py-3">
              <span className="grid h-9 w-9 place-items-center rounded bg-slate-800 text-slate-200">
                {f.type === 'pdf' ? <FileText size={18} /> : <ImageIcon size={18} />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-slate-100">{f.nom}</p>
                <p className="text-xs text-slate-400">
                  {(f.taille / 1024).toFixed(0)} Ko · {f.type}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={Trash2}
                onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}
              >
                Retirer
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
