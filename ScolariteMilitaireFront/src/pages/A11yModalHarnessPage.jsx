import { useState } from 'react';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';

/** Public E2E harness for Modal focus trap / Escape (Phase 35). */
export default function A11yModalHarnessPage() {
  const [open, setOpen] = useState(false);

  return (
    <main id="main-content" className="mx-auto max-w-lg px-4 py-16">
      <h1 className="mb-4 font-serif text-2xl font-semibold text-slate-900">A11y modal harness</h1>
      <Button type="button" onClick={() => setOpen(true)}>
        Open test modal
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Test dialog"
        size="sm"
        footer={
          <Button type="button" variant="primary" onClick={() => setOpen(false)}>
            Done
          </Button>
        }
      >
        <p className="text-sm text-slate-700">Focus should stay inside this dialog.</p>
        <label className="mt-3 block text-sm">
          Sample field
          <input className="input mt-1 w-full" name="sample" />
        </label>
      </Modal>
    </main>
  );
}
