import { EDITABLE_SUBMISSION_STATUSES } from './submissionStatus.js';

const SUBMISSION_OPERATOR_ROLE_CODES = new Set(['franchise_user', 'system_admin']);

/**
 * Pode o utilizador aplicar valores na submissão via assistente (API + UI operacional).
 * Espelha `canEditActiveSubmission` no frontend: operador de submissão + estado editável.
 */
export function canAssistantMutateSubmission(
  roleCodes: readonly string[],
  submissionStatus: string,
): boolean {
  const canOperate = roleCodes.some((code) => SUBMISSION_OPERATOR_ROLE_CODES.has(code));
  const editable = EDITABLE_SUBMISSION_STATUSES.has(submissionStatus);
  return canOperate && editable;
}

export type AssistantInteractionMode = 'full' | 'explain_only';

export function resolveAssistantInteractionMode(
  roleCodes: readonly string[],
  submissionStatus: string,
): AssistantInteractionMode {
  return canAssistantMutateSubmission(roleCodes, submissionStatus) ? 'full' : 'explain_only';
}

/** Produto hub: modo Dúvidas força apenas orientação (espelho API + UI). */
export type AssistantProductTab = 'duvidas' | 'preencher';

/**
 * `true` quando o servidor não deve devolver/aplicar `fieldUpdates`.
 * Replica a regra usada na API `/api/dre-agent` quando `assistantProductTab === 'duvidas'`.
 */
export function shouldAssistantExplainOnly(
  writeAllowed: boolean,
  productTab?: AssistantProductTab,
): boolean {
  return !writeAllowed || productTab === 'duvidas';
}
