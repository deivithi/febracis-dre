import { useEffect, useMemo, useRef } from 'react';
import type { AgentMessageRow } from '../../shared/portal.types';
import type { AssistantInteractionMode } from '../agentPermissions';
import { MessageItem } from './MessageItem';
import { TypingIndicator } from './TypingIndicator';

/** Comando canónico equivalente ao cumprimento inicial. */
const CMD_START = 'cmd:start';

export interface AssistantChatProps {
  loading: boolean;
  messages: AgentMessageRow[];
  lineCodes: readonly string[];
  pending: boolean;
  realignHint: string | null;
  interactionMode: AssistantInteractionMode;
  onCommand: (command: string) => void;
}

export function AssistantChat({
  loading,
  messages,
  lineCodes,
  pending,
  realignHint,
  interactionMode,
  onCommand,
}: AssistantChatProps) {
  const endAnchorRef = useRef<HTMLDivElement>(null);

  const lastAssistantMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const row = messages[i];
      if (row?.role === 'assistant') {
        return row.id;
      }
    }
    return null;
  }, [messages]);

  useEffect(() => {
    endAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, pending, messages[messages.length - 1]?.id]);

  return (
    <div className="dre-assistant__thread-wrap">
      <div
        className="dre-assistant__messages dre-assistant__messages--flat"
        data-testid="dre-assistant-messages"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Histórico do assistente DRE"
      >
        {loading ? (
          <div className="dre-assistant__thread-placeholder">
            <div className="inline-message">Carregando histórico…</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="dre-assistant__ola-gate">
            <p className="dre-assistant__ola-gate-text">
              {interactionMode === 'explain_only'
                ? 'Explore as fases no stepper ou peça uma explicação do campo atual.'
                : 'Siga o roteiro: confirme cada valor proposto antes de avançar. Toque em “Olá” para posicionar o assistente.'}
            </p>
            <button
              type="button"
              className="dre-assistant__chip dre-assistant__chip--primary dre-assistant__ola-btn"
              disabled={pending}
              onClick={() => onCommand(CMD_START)}
            >
              Olá
            </button>
            <p className="dre-assistant__ola-gate-hint">
              As acções rápidas usam comandos <code className="dre-assistant__code-snippet">cmd:*</code> à prova de
              variação de texto.
            </p>
            {pending ? <TypingIndicator /> : null}
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                lineCodes={lineCodes}
                realignBanner={
                  message.role === 'assistant' &&
                  realignHint &&
                  message.id === lastAssistantMessageId
                    ? realignHint
                    : null
                }
              />
            ))}
            {pending ? <TypingIndicator /> : null}
            <div ref={endAnchorRef} className="dre-assistant-chat__scroll-anchor" aria-hidden />
          </>
        )}
      </div>
    </div>
  );
}
