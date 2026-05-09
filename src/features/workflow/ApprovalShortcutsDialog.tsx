import { Keyboard } from 'lucide-react';

type ApprovalShortcutsDialogProps = {
  open: boolean;
  onClose: () => void;
};

const ROWS: { keys: string; descricao: string }[] = [
  { keys: '/', descricao: 'Focar a busca da fila' },
  { keys: 'j / k', descricao: 'Linha anterior ou seguinte (lista visível)' },
  { keys: 'Enter', descricao: 'Focar o painel de decisão (parecer)' },
  { keys: 'e', descricao: 'Aprovar a DRE selecionada (com confirmação)' },
  { keys: 'r', descricao: 'Devolver para ajuste (com confirmação; exige parecer)' },
];

/** U30: atalhos específicos da mesa (complementa `KeyboardShortcutsDialog` global no layout). */
export function ApprovalShortcutsDialog({ open, onClose }: ApprovalShortcutsDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      style={{ zIndex: 340 }}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-shortcuts-title"
        style={{ maxWidth: 440 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <h3 id="approval-shortcuts-title" className="modal__title">
            <Keyboard size={18} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} aria-hidden />
            Atalhos — Aprovações
          </h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>
        <div className="modal__body">
          <p className="approval-shortcuts-intro">
            Estes atalhos funcionam só nesta página e não interferem na paleta global (⌘/ ou Ctrl+/).
          </p>
          <table className="approval-shortcuts-table" aria-label="Lista de atalhos da fila">
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.keys}>
                  <td>
                    <kbd className="approval-shortcuts-kbd">{row.keys}</kbd>
                  </td>
                  <td>{row.descricao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="modal__footer approval-shortcuts-footer">
          <button type="button" className="btn btn--gold" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
