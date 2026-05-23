/**
 * Detecção de conflito optimista (migration 018 — revision + CONCURRENT_MODIFICATION).
 */

export const SUBMISSION_CONFLICT_USER_MESSAGE =
  'Outra pessoa alterou esta submissão enquanto você editava. Recarregamos os dados — confira e tente novamente.';

export function isConcurrentModificationError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.includes('CONCURRENT_MODIFICATION');
}

export function formatSubmissionMutationError(error: unknown, fallback: string): string {
  if (isConcurrentModificationError(error)) {
    return SUBMISSION_CONFLICT_USER_MESSAGE;
  }
  return error instanceof Error ? error.message : fallback;
}
