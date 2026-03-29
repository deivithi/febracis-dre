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
