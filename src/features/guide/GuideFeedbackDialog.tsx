import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useCallback, useId, useState } from 'react';
import { showAppToast } from '../../lib/appToast';
import './GuideFeedbackDialog.css';

export interface GuideFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAIL_SUBJECT = 'Imprecisão reportada — Guia DRE portal';

async function maybeCopyClipboard(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) {
      return false;
    }
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function GuideFeedbackDialog({ open, onOpenChange }: GuideFeedbackDialogProps) {
  const [message, setMessage] = useState('');
  const descId = useId();

  const reset = useCallback(() => setMessage(''), []);

  const handleSubmit = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      showAppToast({
        title: 'Descreva a imprecisão antes de enviar.',
      });
      return;
    }

    const body = `[Guia — imprecisão]\nURL: ${typeof window !== 'undefined' ? window.location.href : ''}\n\n${trimmed}`;
    const copied = await maybeCopyClipboard(body);

    try {
      const mailtoHref = `mailto:?subject=${encodeURIComponent(MAIL_SUBJECT)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoHref;
    } catch {
      /* noop — cliente de e-mail pode não existir */
    }

    showAppToast({
      title: copied ? 'Abertura do e-mail e texto copiado para a área de transferência.' : 'Tente colar sua mensagem manualmente no cliente de e-mail.',
      ...(copied ? { variant: 'success' as const } : {}),
    });
    reset();
    onOpenChange(false);
  }, [message, onOpenChange, reset]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset();
        }
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="feedback-dialog__overlay" />
        <Dialog.Content className="feedback-dialog__content" aria-describedby={descId}>
          <div className="feedback-dialog__header">
            <Dialog.Title className="feedback-dialog__title typo-h3">Reportar imprecisão no Guia</Dialog.Title>
            <Dialog.Close
              type="button"
              className="feedback-dialog__close btn btn--ghost btn--sm"
              aria-label="Fechar o diálogo de feedback do Guia sem enviar."
            >
              <X size={18} aria-hidden />
            </Dialog.Close>
          </div>

          <p id={descId} className="feedback-dialog__description typo-body-sm">
            Descreva o trecho ou a confusão. Ao enviar, abrimos o cliente de e-mail com o texto pré-preenchido e
            copiamos a mensagem quando o navegador permitir — não há servidor dedicado ainda.
          </p>

          <label htmlFor="guide-feedback-text" className="feedback-dialog__label typo-caption">
            Sua observação
          </label>
          <textarea
            id="guide-feedback-text"
            className="feedback-dialog__textarea"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ex.: Na seção X, o fluxo omitiu o passo de…"
          />

          <div className="feedback-dialog__actions">
            <Dialog.Close type="button" className="btn btn--ghost btn--sm">
              Cancelar
            </Dialog.Close>
            <button
              type="button"
              className="btn btn--gold btn--sm"
              onClick={() => void handleSubmit()}
              aria-label="Enviar feedback sobre imprecisão no Guia, abrir e-mail ou copiar o texto para a área de transferência."
            >
              Enviar
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
