import type { QueryClient } from '@tanstack/react-query';

/** Raízes operacionais a refrescar após alterações na submissão ou no assistente. */
export const OPERATIONAL_ROOT_KEYS = [['submissions'], ['dashboard'], ['workflow'], ['franchises'], ['admin-snapshot']] as const;

export async function invalidateSubmissionRelatedQueries(
  queryClient: QueryClient,
  options: {
    activeSubmissionId: string | null;
    agentSessionId: string | null;
    franchiseId: string;
    periodId: string;
  },
) {
  const { activeSubmissionId, agentSessionId, franchiseId, periodId } = options;

  await Promise.all(
    OPERATIONAL_ROOT_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey: [...queryKey] })),
  );

  if (franchiseId && periodId) {
    await queryClient.invalidateQueries({
      queryKey: ['submission-versions', franchiseId, periodId],
    });
  }

  if (activeSubmissionId) {
    await queryClient.invalidateQueries({ queryKey: ['submission-workspace', activeSubmissionId] });
  }

  if (agentSessionId) {
    await queryClient.invalidateQueries({ queryKey: ['agent-messages', agentSessionId] });
  }

  await queryClient.invalidateQueries({
    queryKey: ['agent-session', activeSubmissionId ?? 'no-submission', franchiseId || 'no-franchise', periodId || 'no-period'],
  });
}
