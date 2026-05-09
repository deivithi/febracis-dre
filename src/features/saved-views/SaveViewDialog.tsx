import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useId, useState, type MouseEvent } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { SavedViewFiltersV1 } from './savedViewFilters';
import { humanizeSavedFilters } from './savedViewFilters';
import type { SavedViewPage } from './savedView.types';
import './SaveViewDialog.css';

type SaveViewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: SavedViewPage;
  draftFilters: SavedViewFiltersV1;
  defaultPinned?: boolean;
  onSave: (input: { name: string; isPinned: boolean }) => void;
  isSaving?: boolean;
};

export function SaveViewDialog({
  open,
  onOpenChange,
  page,
  draftFilters,
  defaultPinned = true,
  onSave,
  isSaving = false,
}: SaveViewDialogProps) {
  const titleId = useId();
  const [name, setName] = useState('');
  const [pinned, setPinned] = useState(defaultPinned);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (open) {
      setName('');
      setPinned(defaultPinned);
    }
  }, [open, defaultPinned]);

  const bullets = humanizeSavedFilters(draftFilters);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    onSave({ name: trimmed, isPinned: pinned });
  };

  void page;

  return (
    <AnimatePresence>
      {open ? (
        <div className="save-view-dialog__stack" key="save-view">
          <motion.div
            className="modal-backdrop save-view-dialog__backdrop"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            className="modal save-view-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(ev: MouseEvent<HTMLDivElement>) => ev.stopPropagation()}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 380, damping: 30 }
            }
          >
            <div className="modal__header">
              <h3 id={titleId} className="modal__title">
                Guardar vista atual
              </h3>
              <button
                type="button"
                className="modal__close"
                onClick={() => onOpenChange(false)}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal__body save-view-dialog__body">
                <label className="form-group">
                  <span className="form-label">Nome da vista</span>
                  <input
                    className="form-input"
                    value={name}
                    onChange={(ev) => setName(ev.target.value)}
                    placeholder="Ex: Aprovações Sudeste"
                    autoFocus
                    maxLength={120}
                  />
                </label>

                <div className="save-view-dialog__preview">
                  <span className="form-label">Pré-visualização dos filtros</span>
                  <ul className="save-view-dialog__bullets">
                    {bullets.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>

                <label className="save-view-dialog__toggle">
                  <input type="checkbox" checked={pinned} onChange={(ev) => setPinned(ev.target.checked)} />
                  <span>Fixar na sidebar</span>
                </label>
              </div>
              <div className="modal__footer save-view-dialog__footer">
                <button type="button" className="btn btn--secondary" onClick={() => onOpenChange(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn--gold" disabled={!name.trim() || isSaving}>
                  {isSaving ? 'A guardar…' : 'Guardar'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
