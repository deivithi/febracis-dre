import { useState } from 'react';
import { useAssistantMemory } from '../useAssistantMemory';
import { showAppToast } from '../../../lib/appToast';

/**
 * Aviso passivo de transparência + opt-out da memória do assistente (Fase 1b, LGPD).
 *
 * Só aparece quando há memória de facto guardada nesta franquia (`hasMemory`).
 * Enquanto a memória persona estiver desligada (flag de servidor) não há registos,
 * portanto o aviso fica invisível — aparece sozinho quando a memória passa a acumular.
 */
export function AssistantMemoryNotice({ franchiseId }: { franchiseId: string | null | undefined }) {
  const { hasMemory, clearMemory, clearing } = useAssistantMemory(franchiseId);
  const [confirming, setConfirming] = useState(false);

  if (!hasMemory) {
    return null;
  }

  const handleClear = async () => {
    try {
      await clearMemory();
      showAppToast({ title: 'Memoria limpa. Na proxima conversa, comeco do zero.', variant: 'success' });
    } catch {
      showAppToast({ title: 'Nao consegui limpar a memoria agora. Tente novamente.', variant: 'warning' });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="assistant-memory-notice" role="note" data-testid="assistant-memory-notice">
      <p className="assistant-memory-notice__text">
        Guardo o nosso histórico nesta unidade para te ajudar melhor nas próximas conversas. Você pode limpar quando
        quiser.
      </p>
      {confirming ? (
        <span className="assistant-memory-notice__actions">
          <button
            type="button"
            className="assistant-memory-notice__btn assistant-memory-notice__btn--danger"
            onClick={handleClear}
            disabled={clearing}
          >
            {clearing ? 'Limpando…' : 'Sim, limpar'}
          </button>
          <button
            type="button"
            className="assistant-memory-notice__btn"
            onClick={() => setConfirming(false)}
            disabled={clearing}
          >
            Cancelar
          </button>
        </span>
      ) : (
        <button
          type="button"
          className="assistant-memory-notice__btn"
          onClick={() => setConfirming(true)}
        >
          Limpar memória
        </button>
      )}
    </div>
  );
}
