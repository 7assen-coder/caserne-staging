/**
 * Shown when PATCH/PUT returns 409 version_conflict.
 */
import Modal from './Modal';
import Button from './Button';

export default function VersionConflictModal({ open, message, onReload, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose || onReload}
      title="Conflit de modification"
      size="sm"
      footer={
        <>
          {onClose ? (
            <Button type="button" variant="ghost" onClick={onClose}>
              Fermer
            </Button>
          ) : null}
          <Button type="button" variant="primary" onClick={onReload}>
            Recharger
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        {message
          || 'Un autre officier a modifié cette fiche. Vos modifications n’ont pas été enregistrées.'}
      </p>
    </Modal>
  );
}
