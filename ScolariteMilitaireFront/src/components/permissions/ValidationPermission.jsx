import { useState } from 'react';
import { FileText, ImageIcon, Check, X as XIcon } from 'lucide-react';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { permissionService } from '../../services/permissionService';
import { STATUT_LABEL } from '../../utils/constants';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../../hooks/useAuth';

function Info({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-text-light">{label}</p>
      <p className="text-sm text-text mt-0.5">{value ?? '—'}</p>
    </div>
  );
}

export default function ValidationPermission({ permission, canValidate, onDone }) {
  const { user } = useAuth();
  const [commentaire, setCommentaire] = useState('');
  const [pending, setPending] = useState(false);

  const decide = async (statut) => {
    setPending(true);
    try {
      await permissionService.validate(permission.id, {
        statut,
        commentaire,
        validePar: `${user?.grade ?? ''} ${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim(),
      });
      onDone?.();
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Badge
          tone={
            permission.statut === 'valide'
              ? 'valide'
              : permission.statut === 'refuse'
                ? 'refuse'
                : 'en_attente'
          }
        >
          {STATUT_LABEL[permission.statut]}
        </Badge>
        <span className="text-xs text-text-light">
          Demande du {formatDate(permission.dateDemande)}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Info label="Élève" value={permission.eleveNom} />
        <Info label="Matricule" value={permission.matricule} />
        <Info label="Section" value={permission.section} />
        <Info label="Type" value={STATUT_LABEL[permission.typeAbsence] ?? permission.typeAbsence} />
        <Info label="Motif" value={STATUT_LABEL[permission.motif] ?? permission.motif} />
        <Info
          label="Période"
          value={`${formatDate(permission.dateDebut)} → ${formatDate(permission.dateFin)}`}
        />
      </div>

      {permission.commentaire && (
        <div>
          <p className="label">Commentaire de la demande</p>
          <p className="rounded-md border border-white/10 bg-slate-900/60 p-3 text-sm text-slate-300">
            {permission.commentaire}
          </p>
        </div>
      )}

      {permission.justificatif && (
        <div>
          <p className="label">Pièce justificative</p>
          <div className="flex items-center gap-3 rounded-md border border-white/10 p-3">
            <span className="grid h-9 w-9 place-items-center rounded bg-slate-800 text-slate-200">
              {permission.justificatif.type === 'pdf' ? <FileText size={18} /> : <ImageIcon size={18} />}
            </span>
            <div className="flex-1">
              <p className="text-sm text-text font-medium">{permission.justificatif.nom}</p>
              <p className="text-xs text-text-light uppercase">{permission.justificatif.type}</p>
            </div>
            <button className="text-sm text-navy underline">Consulter</button>
          </div>
        </div>
      )}

      {permission.validePar && (
        <div className="text-xs text-text-light">
          Décision rendue par <span className="font-medium text-text">{permission.validePar}</span>
        </div>
      )}

      {canValidate && (
        <div className="space-y-3 border-t border-white/10 pt-4">
          <label className="block">
            <span className="label">Commentaire de décision</span>
            <textarea
              rows={3}
              className="input"
              placeholder="Motivation ou conditions…"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
            />
          </label>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="danger"
              icon={XIcon}
              disabled={pending}
              onClick={() => decide('refuse')}
            >
              Refuser
            </Button>
            <Button
              variant="primary"
              icon={Check}
              disabled={pending}
              onClick={() => decide('valide')}
            >
              Valider
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
