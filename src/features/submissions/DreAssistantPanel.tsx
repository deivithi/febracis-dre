import { useCallback, useEffect, useMemo, useRef, type KeyboardEvent } from 'react';
import { Bot, BookOpenText, CornerDownLeft, HelpCircle, Loader2, SkipForward, Sparkles } from 'lucide-react';
import type { AgentMessageRow } from '../shared/portal.types';
import { AssistantProse } from './AssistantProse';
import type { AssistantInteractionMode } from './agentPermissions';
import type { DreAssistantCitation } from './dreAssistant';
import { stripInternalLineCodesFromUserText } from './dreAssistant';

export interface DreAssistantPanelProps {
  enabled: boolean;
  loading: boolean;
  pending: boolean;
  focusLabel: string | null;
  nextPrompt: string | null;
  /** Rótulo da fase persistida em `flow_checkpoint` (state_json). */
  flowPhaseLabel: string | null;
  /** Linha de realinhamento quando a última intenção foi off-topic. */
  realignHint: string | null;
  messages: AgentMessageRow[];
  draftValue: string;
  lastCitations: DreAssistantCitation[];
  /** Códigos internos das linhas — para limpar histórico antigo na UI. */
  lineCodes: string[];
  filledSteps: number;
  totalSteps: number;
  agentMode: 'llm' | 'fallback' | null;
  /** Operação completa vs. só orientação (leitura na submissão). */
  interactionMode: AssistantInteractionMode;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onQuickAction: (prompt: string) => void;
}

const OLA_PROMPT = 'Olá! Vamos começar o preenchimento da DRE.';

const QUICK_ACTIONS_FULL: { label: string; prompt: string; variant?: 'primary' }[] = [
  { label: 'Olá', prompt: OLA_PROMPT, variant: 'primary' },
  { label: 'Explicar campo', prompt: 'Explicar o campo atual' },
  { label: 'Saltar por agora', prompt: 'Quero pular o campo em foco por agora' },
  { label: 'Salvar rascunho', prompt: 'Salvar rascunho atual' },
];

const QUICK_ACTIONS_EXPLAIN: { label: string; prompt: string; variant?: 'primary' }[] = [
  { label: 'Olá', prompt: OLA_PROMPT, variant: 'primary' },
  { label: 'Explicar campo', prompt: 'Explicar o campo atual' },
];

/** Altura máxima do textarea (~8 linhas) em px, alinhada ao line-height do composer. */
const TEXTAREA_MAX_HEIGHT_PX = 200;

export function DreAssistantPanel({
  enabled,
  loading,
  pending,
  focusLabel,
  nextPrompt,
  flowPhaseLabel,
  realignHint,
  messages,
  draftValue,
  lastCitations,
  lineCodes,
  filledSteps,
  totalSteps,
  agentMode,
  interactionMode,
  onDraftChange,
  onSend,
  onQuickAction,
}: DreAssistantPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const quickActions = interactionMode === 'explain_only' ? QUICK_ACTIONS_EXPLAIN : QUICK_ACTIONS_FULL;

  const progressPercent = useMemo(() => {
    if (totalSteps <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((filledSteps / totalSteps) * 100));
  }, [filledSteps, totalSteps]);

  const progressLabel =
    totalSteps > 0 ? `${filledSteps} de ${totalSteps} campos com valor` : 'Catálogo de campos a carregar…';

  const modeLabel =
    agentMode === 'llm'
      ? 'Assistente online (OpenRouter)'
      : agentMode === 'fallback'
        ? 'Modo guiado local (sem API)'
        : null;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT_PX);
    el.style.height = `${Math.max(next, 52)}px`;
  }, [draftValue, enabled]);

  const handleComposerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== 'Enter' || event.shiftKey) {
        return;
      }
      if (event.nativeEvent.isComposing) {
        return;
      }
      event.preventDefault();
      if (!pending && draftValue.trim().length > 0) {
        onSend();
      }
    },
    [draftValue, onSend, pending],
  );

  return (
    <div className="card card--accent dre-assistant dre-assistant--hero">
      <div className="dre-assistant__hero-top dre-assistant__hero-top--compact">
        <div className="dre-assistant__hero-title-row">
          <span className="badge badge--gold">Assistente DRE</span>
          {modeLabel ? (
            <details className="dre-assistant__tech-details">
              <summary className="dre-assistant__tech-summary">Detalhes técnicos</summary>
              <span className="dre-assistant__mode-pill dre-assistant__mode-pill--inline">{modeLabel}</span>
            </details>
          ) : null}
        </div>
        <div className="dre-assistant__hero-heading dre-assistant__hero-heading--compact">
          <div className="dre-assistant__icon" aria-hidden>
            <Bot />
          </div>
          <div>
            <h3 className="dre-assistant__hero-title">
              {interactionMode === 'explain_only' ? 'Orientação sobre a DRE' : 'Conversa guiada'}
            </h3>
            <p className="dre-assistant__hero-sub">
              {interactionMode === 'explain_only' ? (
                <>
                  Modo leitura: explico campos e fluxo; quem preenche valores é o franqueado com permissão de operação.{' '}
                  <kbd className="dre-assistant__kbd">Enter</kbd> envia; <kbd className="dre-assistant__kbd">Shift+Enter</kbd>{' '}
                  nova linha.
                </>
              ) : (
                <>
                  Toque em <strong>Olá</strong> ou escreva abaixo. <kbd className="dre-assistant__kbd">Enter</kbd> envia;{' '}
                  <kbd className="dre-assistant__kbd">Shift+Enter</kbd> nova linha.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="card__body dre-assistant__body dre-assistant__body--chat">
        {!enabled ? (
          <div className="dre-assistant__empty">
            <div className="dre-assistant__empty-icon">
              <Sparkles />
            </div>
            <h4>Abra um rascunho para ativar o assistente</h4>
            <p>
              Com uma submissão ativa, indico o próximo campo, o formato da resposta e mantenho o histórico desta
              jornada.
            </p>
          </div>
        ) : (
          <div className="dre-assistant__shell">
            {interactionMode === 'explain_only' ? (
              <div className="inline-message dre-assistant__mode-banner" role="status">
                <strong>Modo orientação.</strong> Sem aplicar valores na submissão — use o painel para acompanhar os
                números oficiais.
              </div>
            ) : null}
            <div className="dre-assistant__progress-block" aria-label="Progresso do preenchimento">
              <div className="dre-assistant__progress-meta">
                <span>{progressLabel}</span>
                <span className="dre-assistant__progress-meta-right">
                  {flowPhaseLabel ? (
                    <span className="dre-assistant__phase-pill" title="Estado do fluxo guardado na sessão">
                      {flowPhaseLabel}
                    </span>
                  ) : null}
                  {totalSteps > 0 ? (
                    <span className="dre-assistant__progress-percent">{progressPercent}%</span>
                  ) : null}
                </span>
              </div>
              <div
                className="dre-assistant__progress-track"
                role="progressbar"
                aria-label={`Progresso: ${totalSteps > 0 ? progressPercent : 0} por cento`}
                aria-valuenow={Number(totalSteps > 0 ? progressPercent : 0)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="dre-assistant__progress-fill"
                  style={{ width: `${totalSteps > 0 ? progressPercent : 0}%` }}
                />
              </div>
              <p className="dre-assistant__focus-line">
                <HelpCircle size={14} aria-hidden />
                <span>
                  <strong>Próximo passo:</strong>{' '}
                  <strong>{focusLabel ?? 'Aguardando o próximo passo'}</strong>
                  {nextPrompt ? (
                    <>
                      <span className="dre-assistant__focus-sep">·</span>
                      <span className="dre-assistant__next-inline">{nextPrompt}</span>
                    </>
                  ) : null}
                </span>
              </p>
              {realignHint ? (
                <p className="dre-assistant__realign-hint" role="status">
                  {realignHint}
                </p>
              ) : null}
            </div>

            <div className="dre-assistant__chips" role="toolbar" aria-label="Atalhos do assistente">
              {quickActions.map((action) => (
                <button
                  key={action.prompt}
                  type="button"
                  className={
                    action.variant === 'primary'
                      ? 'dre-assistant__chip dre-assistant__chip--primary'
                      : 'dre-assistant__chip dre-assistant__chip--ghost'
                  }
                  onClick={() => onQuickAction(action.prompt)}
                  disabled={loading || pending}
                >
                  {action.label === 'Saltar por agora' ? <SkipForward size={14} aria-hidden /> : null}
                  {action.label === 'Explicar campo' ? <HelpCircle size={14} aria-hidden /> : null}
                  {action.label}
                </button>
              ))}
            </div>

            <div className="dre-assistant__thread-wrap">
              <div
                className="dre-assistant__messages"
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
                        ? 'Pergunte sobre qualquer campo da DRE ou sobre o fluxo de submissão. Não aplico valores neste perfil.'
                        : 'Comece por aqui: o assistente percorre todos os campos da DRE na ordem correta e diz exatamente o que precisa em cada mensagem.'}
                    </p>
                    <button
                      type="button"
                      className="dre-assistant__chip dre-assistant__chip--primary dre-assistant__ola-btn"
                      disabled={pending}
                      onClick={() => onQuickAction(OLA_PROMPT)}
                    >
                      Olá
                    </button>
                    <p className="dre-assistant__ola-gate-hint">
                      Ou escreva o valor em reais no campo no final — <kbd className="dre-assistant__kbd">Enter</kbd>{' '}
                      para enviar.
                    </p>
                    {pending ? (
                      <p className="dre-assistant__thinking" role="status" aria-live="polite">
                        <Loader2 className="dre-assistant__thinking-icon" size={16} aria-hidden />
                        A processar a sua mensagem…
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <>
                    {messages.map((message) => {
                      if (message.role !== 'user' && message.role !== 'assistant') {
                        return null;
                      }
                      return (
                        <article
                          key={message.id}
                          className={`dre-assistant__message dre-assistant__message--${message.role}`}
                        >
                          <span className="dre-assistant__message-role">
                            {message.role === 'assistant' ? 'Assistente' : 'Você'}
                          </span>
                          <div className="dre-assistant__message-body">
                            {message.role === 'assistant' ? (
                              <AssistantProse
                                text={
                                  stripInternalLineCodesFromUserText(message.content, lineCodes) || message.content
                                }
                              />
                            ) : (
                              message.content
                            )}
                          </div>
                        </article>
                      );
                    })}
                    {pending ? (
                      <div
                        className="dre-assistant__thinking dre-assistant__thinking--row"
                        role="status"
                        aria-live="polite"
                      >
                        <Loader2 className="dre-assistant__thinking-icon" size={16} aria-hidden />
                        A preparar a resposta do assistente…
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>

            {lastCitations.length > 0 && (
              <details className="dre-assistant__citations-details">
                <summary className="dre-assistant__citations-summary">
                  <BookOpenText size={15} aria-hidden />
                  Base de conhecimento usada (curadoria interna)
                </summary>
                <div className="dre-assistant__citation-list">
                  {lastCitations.map((citation) => (
                    <div key={`${citation.source}-${citation.title}`} className="dre-assistant__citation">
                      <strong>{citation.title}</strong>
                      <span>{citation.source}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}

            <div
              className={`dre-assistant__composer-dock ${pending ? 'dre-assistant__composer-dock--pending' : ''}`}
            >
              <div className="dre-assistant__composer">
                <textarea
                  ref={textareaRef}
                  data-testid="dre-assistant-input"
                  className="form-input dre-assistant__textarea"
                  value={draftValue}
                  onChange={(event) => onDraftChange(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder={
                    interactionMode === 'explain_only'
                      ? 'Dúvida sobre um campo da DRE ou sobre o fluxo…'
                      : 'Valor em reais, dúvida sobre o campo ou pedido para salvar…'
                  }
                  disabled={pending}
                  rows={1}
                  aria-label="Mensagem para o assistente DRE"
                />
                <button
                  type="button"
                  className="btn btn--gold dre-assistant__send"
                  onClick={onSend}
                  disabled={pending || draftValue.trim().length === 0}
                  data-testid="dre-assistant-send"
                >
                  <CornerDownLeft size={16} aria-hidden />
                  {pending ? 'A processar…' : 'Enviar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
