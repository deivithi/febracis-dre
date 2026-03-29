/**
 * Estados de submissão alinhados ao workflow (camada única de verdade para UI).
 * Nomes coincidem com os valores persistidos na API.
 */
export const SUBMISSION_STATUS = {
  DRAFT: 'draft',
  REOPENED: 'reopened',
  PENDING_ADJUSTMENT: 'pending_adjustment',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
} as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUS)[keyof typeof SUBMISSION_STATUS];

export const EDITABLE_SUBMISSION_STATUSES: ReadonlySet<string> = new Set([
  SUBMISSION_STATUS.DRAFT,
  SUBMISSION_STATUS.REOPENED,
  SUBMISSION_STATUS.PENDING_ADJUSTMENT,
]);

export const LOCKED_SUBMISSION_STATUSES: ReadonlySet<string> = new Set([
  SUBMISSION_STATUS.SUBMITTED,
  SUBMISSION_STATUS.UNDER_REVIEW,
  SUBMISSION_STATUS.APPROVED,
]);

export type SubmissionUiPhase = 'editing' | 'in_review' | 'approved' | 'adjustment';

export function isEditableSubmissionStatus(status: string | null | undefined): boolean {
  return Boolean(status && EDITABLE_SUBMISSION_STATUSES.has(status));
}

export function isLockedSubmissionStatus(status: string | null | undefined): boolean {
  return Boolean(status && LOCKED_SUBMISSION_STATUSES.has(status));
}

export function getSubmissionUiPhase(status: string | null | undefined): SubmissionUiPhase {
  if (!status) return 'editing';
  if (status === SUBMISSION_STATUS.APPROVED) return 'approved';
  if (status === SUBMISSION_STATUS.PENDING_ADJUSTMENT) return 'adjustment';
  if (status === SUBMISSION_STATUS.SUBMITTED || status === SUBMISSION_STATUS.UNDER_REVIEW) {
    return 'in_review';
  }
  return 'editing';
}
