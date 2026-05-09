/**
 * Estado de submissão alinhado ao CHECK em `001_foundation.sql` e ao fluxo RPC em `010_access_and_submission_workflows.sql`.
 * O Postgres não valida todos os arcos em `fn_review_submission`; esta camada espelha o fluxo explícito do produto.
 */

export const SUBMISSION_DB_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'pending_adjustment',
  'approved',
  'closed',
  'reopened',
  'superseded',
] as const;

export type SubmissionDbStatus = (typeof SUBMISSION_DB_STATUSES)[number];

/** Estados participantes do ciclo principal + retorno legítimo `reopened` (edição, migração 010). */
export type SubmissionWorkflowStatus = SubmissionDbStatus;

export type SubmissionTransitionAction =
  | 'submit'
  | 'start_review'
  | 'approve'
  | 'request_adjustment';

export type WorkflowCaps = {
  /** Equivale a `can_operate_submission` (franchise_user / admin na unidade). */
  canOperateSubmission: boolean;
  /** Equivale a `can_manage_review` (revisor / controladoria). */
  canManageReview: boolean;
};

export type TransitionFailureCode = 'FORBIDDEN_ROLE' | 'INVALID_TRANSITION';

export type TransitionResult =
  | { ok: true; nextStatus: SubmissionWorkflowStatus }
  | { ok: false; code: TransitionFailureCode; reason: string };

const EDITABLE_STATUSES = new Set<SubmissionWorkflowStatus>([
  'draft',
  'reopened',
  'pending_adjustment',
]);

/** Espelha `is_submission_editable_status` (011) / políticas RLS de edição (010). */
export function isSubmissionEditableStatus(status: SubmissionWorkflowStatus): boolean {
  return EDITABLE_STATUSES.has(status);
}

function roleAllowsAction(action: SubmissionTransitionAction, caps: WorkflowCaps): boolean {
  switch (action) {
    case 'submit':
      return caps.canOperateSubmission;
    case 'start_review':
    case 'approve':
    case 'request_adjustment':
      return caps.canManageReview;
    default:
      return false;
  }
}

/**
 * Calcula o próximo status ou erro. Ordem: papel da ação → arco válido para o estado atual.
 */
export function transitionSubmission(
  fromStatus: SubmissionWorkflowStatus,
  action: SubmissionTransitionAction,
  caps: WorkflowCaps,
): TransitionResult {
  if (!roleAllowsAction(action, caps)) {
    return {
      ok: false,
      code: 'FORBIDDEN_ROLE',
      reason: 'Papel insuficiente para esta ação.',
    };
  }

  switch (action) {
    case 'submit': {
      if (!isSubmissionEditableStatus(fromStatus)) {
        return {
          ok: false,
          code: 'INVALID_TRANSITION',
          reason: `Envio não permitido a partir de "${fromStatus}" (submissão bloqueada para edição).`,
        };
      }
      return { ok: true, nextStatus: 'submitted' };
    }
    case 'start_review': {
      if (fromStatus !== 'submitted') {
        return {
          ok: false,
          code: 'INVALID_TRANSITION',
          reason: `Somente "submitted" pode ir para revisão; estado atual: "${fromStatus}".`,
        };
      }
      return { ok: true, nextStatus: 'under_review' };
    }
    case 'approve': {
      if (fromStatus !== 'under_review') {
        return {
          ok: false,
          code: 'INVALID_TRANSITION',
          reason: `Aprovação exige "under_review"; estado atual: "${fromStatus}".`,
        };
      }
      return { ok: true, nextStatus: 'approved' };
    }
    case 'request_adjustment': {
      if (fromStatus !== 'under_review') {
        return {
          ok: false,
          code: 'INVALID_TRANSITION',
          reason: `Devolução para ajuste exige "under_review"; estado atual: "${fromStatus}".`,
        };
      }
      return { ok: true, nextStatus: 'pending_adjustment' };
    }
  }
}

/** Indica se existe um arco explícito permitido from→to com as capacidades dadas (uma única ação por arco). */
export function canTransition(
  fromStatus: SubmissionWorkflowStatus,
  toStatus: SubmissionWorkflowStatus,
  caps: WorkflowCaps,
): boolean {
  const actions: SubmissionTransitionAction[] = [
    'submit',
    'start_review',
    'approve',
    'request_adjustment',
  ];
  for (const action of actions) {
    const r = transitionSubmission(fromStatus, action, caps);
    if (r.ok && r.nextStatus === toStatus) return true;
  }
  return false;
}
