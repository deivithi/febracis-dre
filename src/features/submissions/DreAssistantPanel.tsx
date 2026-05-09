import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  Bot,
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  CornerDownLeft,
  HelpCircle,
  Loader2,
  MapPin,
  RefreshCw,
  SkipForward,
  Sparkles,
  List,
} from 'lucide-react';
import type { AgentMessageRow, DreInputCatalogLine } from '../shared/portal.types';
import { AssistantProse } from './AssistantProse';
import type { AssistantInteractionMode } from './agentPermissions';
import {
  DRE_PHASE_COUNT,
  getDrePhaseMetas,
  getFieldGuide,
  getPhaseProgress,
  mapLineToPhase,
  stripInternalLineCodesFromUserText,
  type DreAssistantCitation,
  type ProposedAssistantValue,
} from './dreAssistant';
import { CurrencyKeypad } from './components/CurrencyKeypad';

/** Comando canónico equivalente ao cumprimento inicial. */
const CMD_START = 'cmd:start';

function formatBrl(amount: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
}

export interface DreAssistantPanelProps {
  enabled: boolean;
  loading: boolean;
  pending: boolean;
  focusLabel: string | null;
  /** Linha em foco (catálogo) para CTA e microcopy */
  focusLine: DreInputCatalogLine | null;
  /** Linhas do catálogo (stepper / fases) */
  catalogLines: DreInputCatalogLine[];
  /** Valores actuais por line_code (progresso por fase) */
  lineValueMap: Record<string, string>;
  /** Fase DRE persistida ou derivada no workspace */
  drePhaseId: number | null;
  /** Proposta HITL pendente (sessão) */
  proposedValue: ProposedAssistantValue | null;
  skippedLineCodes: readonly string[];
  canEditActiveSubmission: boolean;
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
  /** Comandos determinísticos `cmd:*`. */
  onCommand: (command: string) => void;
  onSaveDraft: () => void;
  onSubmitReview: () => void;
  savePending: boolean;
  submitPending: boolean;
}

/** Altura máxima do textarea (~8 linhas) em px, alinhada ao line-height do composer. */
const TEXTAREA_MAX_HEIGHT_PX = 200;

/** Trecho do glossário (repo: `docs/dre-glossario.md`). */
const GLOSSARY_EXCERPT = `Glossário DRE (rascunho para revisão da controladoria)
— Ordem canónica: Receita bruta → Deduções → Custos variáveis e evento → Marketing → Inadimplência → Folha → Estrutura → Impostos → Resultado (MC2/EBITDA).
— Referências: Lei 6.404/76 art. 187, NBC TG 26 (CFC), Conceptual Framework IFRS, setoriais de franquia (IFB/SBVC).
— Detalhe por linha editável: ver documento completo em docs/dre-glossario.md no repositório febracis-dre.`;

export function DreAssistantPanel({
  enabled,
  loading,
  pending,
  focusLabel,
  focusLine,
  catalogLines,
  lineValueMap,
  drePhaseId,
  proposedValue,
  skippedLineCodes,
  canEditActiveSubmission,
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
  onCommand,
  onSaveDraft,
  onSubmitReview,
  savePending,
  submitPending,
}: DreAssistantPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [keypadOpen, setKeypadOpen] = useState(false);

  const skippedSet = useMemo(() => new Set(skippedLineCodes), [skippedLineCodes]);

  const activePhaseId = useMemo(() => {
    if (drePhaseId !== null && drePhaseId >= 1 && drePhaseId <= DRE_PHASE_COUNT) {
      return drePhaseId;
    }
    if (focusLine) {
      return mapLineToPhase(focusLine);
    }
    return 1;
  }, [drePhaseId, focusLine]);

  const phaseMetas = useMemo(() => getDrePhaseMetas(), []);

  const focusGuide = focusLine ? getFieldGuide(focusLine) : null;

  const proposedLine = useMemo(() => {
    if (!proposedValue) return null;
    return catalogLines.find((row) => row.line_code === proposedValue.line_code) ?? null;
  }, [catalogLines, proposedValue]);

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

  const insertTargetLine = focusLine ?? catalogLines[0] ?? null;

  const toolbarDisabled = loading || pending || !enabled;
  const ctaDisabled = toolbarDisabled || !insertTargetLine;

  return (
    <div className="card card--accent dre-assistant dre-assistant--hero">
      {agentMode === 'fallback' ? (
        <div className="inline-message inline-message--warning dre-assistant__mode-banner" role="status">
          Modo guiado local ativo (sem chamada à API de modelo). As respostas seguem o catálogo e regras determinísticas;
          quando a API voltar, o painel técnico mostrará «Assistente online».
        </div>
      ) : null}
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
                  Modo leitura: exploro fases e campos; valores só com perfil de edição. Botões enviam comandos
                  determinísticos (sem texto livre obsoleto nos atalhos). <kbd className="dre-assistant__kbd">Enter</kbd>{' '}
                  envia mensagem própria.
                </>
              ) : (
                <>
                  Use os botões do cartão do campo ou a barra de ferramentas — cada um envia um comando canónico
                  estável para o servidor. Mensagem livre continua disponível em baixo quando precisar.
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

            <div className="dre-assistant__phase-stepper" data-testid="dre-assistant-stepper" role="navigation" aria-label="Fases da DRE">
              {phaseMetas.map((phase) => {
                const prog = getPhaseProgress(phase.id, catalogLines, lineValueMap, skippedSet);
                const pillClass =
                  phase.id === activePhaseId
                    ? 'dre-assistant__phase-chip dre-assistant__phase-chip--current'
                    : 'dre-assistant__phase-chip';
                return (
                  <button
                    key={phase.id}
                    type="button"
                    className={pillClass}
                    title={phase.title}
                    disabled={toolbarDisabled || catalogLines.length === 0}
                    onClick={() => onCommand(`cmd:phase_summary ${phase.id}`)}
                  >
                    <span className="dre-assistant__phase-chip-id">{phase.id}</span>
                    <span className="dre-assistant__phase-chip-meta">
                      {prog.filled}/{prog.total}
                    </span>
                  </button>
                );
              })}
            </div>

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
            </div>

            <section className="dre-assistant__cta-card" aria-labelledby="dre-assistant-cta-title">
              <div className="dre-assistant__cta-head">
                <h4 id="dre-assistant-cta-title" className="dre-assistant__cta-title">
                  {focusGuide?.label ?? focusLabel ?? 'Aguardando o próximo campo'}
                </h4>
                {focusGuide ? (
                  <p className="dre-assistant__cta-help">{focusGuide.help}</p>
                ) : (
                  <p className="dre-assistant__cta-help">
                    Comece por <strong>Olá</strong> (comando <code className="dre-assistant__code-snippet">cmd:start</code>) ou
                    escolha uma fase no stepper.
                  </p>
                )}
              </div>
              {focusLine ? (
                <p className="dre-assistant__cta-micro">
                  Este valor entra em <strong>{focusLine.section_name}</strong> e alimenta{' '}
                  <strong>{focusLine.line_name}</strong>.
                </p>
              ) : null}
              <div className="dre-assistant__cta-actions">
                <button
                  type="button"
                  className="btn btn--ghost dre-assistant__cta-btn"
                  data-testid="dre-assistant-cta-explain"
                  disabled={ctaDisabled}
                  onClick={() => onCommand('cmd:explain_field')}
                >
                  <HelpCircle size={16} aria-hidden /> Explicar
                </button>
                {interactionMode === 'full' && canEditActiveSubmission ? (
                  <button
                    type="button"
                    className="btn btn--gold dre-assistant__cta-btn"
                    disabled={ctaDisabled || !insertTargetLine}
                    onClick={() => setKeypadOpen(true)}
                  >
                    Inserir valor
                  </button>
                ) : null}
                {interactionMode === 'full' && canEditActiveSubmission ? (
                  <button
                    type="button"
                    className="btn btn--ghost dre-assistant__cta-btn"
                    disabled={ctaDisabled}
                    onClick={() => onCommand('cmd:skip_field')}
                  >
                    <SkipForward size={16} aria-hidden /> Pular
                  </button>
                ) : null}
              </div>
              {nextPrompt ? (
                <p className="dre-assistant__cta-next">
                  <strong>Sugestão:</strong> {nextPrompt}
                </p>
              ) : null}
              {keypadOpen && insertTargetLine && interactionMode === 'full' ? (
                <div className="dre-assistant__keypad-wrap">
                  <CurrencyKeypad
                    key={insertTargetLine.line_code}
                    lineCode={insertTargetLine.line_code}
                    lineLabel={getFieldGuide(insertTargetLine).label}
                    disabled={pending}
                    onCancel={() => setKeypadOpen(false)}
                    onPropose={(cmd) => {
                      setKeypadOpen(false);
                      onCommand(cmd);
                    }}
                  />
                </div>
              ) : null}
            </section>

            {proposedValue && interactionMode === 'full' ? (
              <div className="dre-assistant__hitl-card" role="region" aria-label="Confirmação de valor proposto">
                <p className="dre-assistant__hitl-text">
                  <strong>Proposta pendente:</strong> {formatBrl(proposedValue.amount)}
                  {proposedLine ? ` → ${proposedLine.line_name}` : ` → ${proposedValue.line_code}`}
                </p>
                <div className="dre-assistant__hitl-actions">
                  <button
                    type="button"
                    className="btn btn--gold"
                    data-testid="dre-assistant-hitl-confirm"
                    disabled={!canEditActiveSubmission || toolbarDisabled}
                    onClick={() => onCommand('cmd:confirm_value')}
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    disabled={toolbarDisabled}
                    onClick={() => onCommand('cmd:reject_value')}
                  >
                    Editar / cancelar
                  </button>
                </div>
              </div>
            ) : null}

            <div className="dre-assistant__toolbar" role="toolbar" aria-label="Navegação guiada da DRE">
              <button
                type="button"
                className="btn btn--ghost btn--compact"
                disabled={toolbarDisabled}
                onClick={() => onCommand('cmd:where_am_i')}
              >
                <MapPin size={14} aria-hidden /> Onde estou
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--compact"
                disabled={toolbarDisabled}
                onClick={() => onCommand('cmd:prev_field')}
              >
                <ChevronLeft size={14} aria-hidden /> Voltar
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--compact"
                disabled={toolbarDisabled}
                onClick={() => onCommand('cmd:next_field')}
              >
                Próximo <ChevronRight size={14} aria-hidden />
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--compact"
                disabled={toolbarDisabled}
                onClick={() => onCommand('cmd:phase_summary')}
              >
                Resumo da fase
              </button>
              {interactionMode === 'explain_only' ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--compact"
                  disabled={toolbarDisabled}
                  onClick={() => onCommand('cmd:list_phase')}
                >
                  <List size={14} aria-hidden /> Campos da fase
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn--ghost btn--compact"
                disabled={toolbarDisabled}
                onClick={() => onCommand('cmd:restart')}
              >
                <RefreshCw size={14} aria-hidden /> Recomeçar
              </button>
              {interactionMode === 'full' ? (
                <>
                  <button
                    type="button"
                    className="btn btn--compact"
                    disabled={!canEditActiveSubmission || savePending || toolbarDisabled}
                    onClick={() => onSaveDraft()}
                  >
                    {savePending ? 'A gravar…' : 'Salvar rascunho'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--gold btn--compact"
                    disabled={!canEditActiveSubmission || submitPending || toolbarDisabled}
                    onClick={() => onSubmitReview()}
                  >
                    {submitPending ? 'A enviar…' : 'Submeter revisão'}
                  </button>
                </>
              ) : null}
            </div>

            {realignHint ? (
              <p className="dre-assistant__realign-hint" role="status">
                {realignHint}
              </p>
            ) : null}

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

            {lastCitations.length > 0 ? (
              <details className="dre-assistant__citations-details">
                <summary className="dre-assistant__citations-summary">
                  <BookOpenText size={15} aria-hidden />
                  Base de conhecimento usada (última resposta)
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
            ) : null}
            <details className="dre-assistant__citations-details dre-assistant__glossary-details">
              <summary className="dre-assistant__citations-summary">
                <BookOpenText size={15} aria-hidden />
                Glossário DRE (referências)
              </summary>
              <div className="dre-assistant__glossary-excerpt">
                <pre>{GLOSSARY_EXCERPT}</pre>
                <p className="dre-assistant__glossary-hint">
                  Documento completo: <code>docs/dre-glossario.md</code> no repositório — placeholder para revisão
                  Febracis Controladoria.
                </p>
              </div>
            </details>

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
                      ? 'Dúvida livre sobre um campo ou o fluxo…'
                      : 'Valor em reais, dúvida ou pedido em linguagem natural…'
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
