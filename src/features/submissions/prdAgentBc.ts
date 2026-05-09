/**
 * Contratos comportamentais §9-bis PRD (`docs/PRD-canonical.md`) — regras «NUNCA» BC-01…BC-07.
 * Cobertura binária: `tests/unit/prd-nuncas-bc.test.ts`.
 */
import type { DreInputCatalogLine } from '../shared/portal.types.js';
import {
  canAssistantMutateSubmission,
  shouldAssistantExplainOnly,
  type AssistantProductTab,
} from './agentPermissions.js';
import type { DreAssistantFieldUpdate } from './dreAssistant.js';
import { validateAssistantFieldUpdates } from './dreAssistant.js';

/** BC-01 — só linhas editáveis pelo catálogo guiado (alinhado a `input_mode === 'currency'` no fluxo assistente). */
export function catalogLineCodesAssistantMayMutate(lines: DreInputCatalogLine[]): Set<string> {
  return new Set(
    lines.filter((line) => line.input_mode === 'currency').map((line) => line.line_code),
  );
}

/** BC-01 — filtra `fieldUpdates` contra catálogo mutável + validação numérica. */
export function sanitizeAssistantFieldUpdatesAgainstCatalog(
  updates: DreAssistantFieldUpdate[],
  lines: DreInputCatalogLine[],
): DreAssistantFieldUpdate[] {
  const mutableCodes = catalogLineCodesAssistantMayMutate(lines);
  return validateAssistantFieldUpdates(updates, mutableCodes);
}

/** BC-02 — sessão agente deve referir a mesma submissão que o pedido HTTP. */
export function agentSessionSubmissionIdsAligned(
  sessionSubmissionId: string | null,
  requestSubmissionId: string,
): boolean {
  return sessionSubmissionId === requestSubmissionId;
}

/** BC-06 — `agent_sessions.franchise_id` deve coincidir com a submissão (defesa contra pedido cross-franchise). */
export function assistantSessionFranchiseMatchesSubmission(
  sessionFranchiseId: string,
  submissionFranchiseId: string,
): boolean {
  return sessionFranchiseId === submissionFranchiseId;
}

/**
 * BC-05 — persistência de deltas do assistente só com papel + estado editáveis e sem modo produto «Dúvidas».
 * Alinha-se a `canAssistantMutateSubmission` + `shouldAssistantExplainOnly` na API.
 */
export function assistantFieldUpdatesPersistenceAllowed(
  roleCodes: readonly string[],
  submissionStatus: string,
  productTab?: AssistantProductTab,
): boolean {
  const writeAllowed = canAssistantMutateSubmission(roleCodes, submissionStatus);
  return writeAllowed && !shouldAssistantExplainOnly(writeAllowed, productTab);
}

/** BC-07 — modo servidor `explain_only` elimina `fieldUpdates` independentemente do pedido do utilizador. */
export function serverPolicyClearsFieldUpdatesWhenExplainOnly(
  explainOnly: boolean,
  updates: DreAssistantFieldUpdate[],
): DreAssistantFieldUpdate[] {
  return explainOnly ? [] : updates;
}

/**
 * BC-04 — transições workflow (aprovar/devolver) não são efectuadas pelo handler HTTP do agente;
 * ficam em RPC/UI dedicados (`portal.api` / Postgres). Valor documental para testes de regressão.
 */
export const WORKFLOW_TRANSITION_VIA_DRE_AGENT_HTTP_HANDLER = false as const;
