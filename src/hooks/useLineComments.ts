import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createLineComment,
  fetchLineCommentOpenRootCounts,
  fetchLineComments,
  fetchOpenLineCommentThreads,
  markLineCommentCritical,
  replyLineComment,
  resolveLineCommentThread,
  softDeleteLineComment,
  updateLineCommentContent,
} from '../features/shared/lineComments.api';
import type { SubmissionLineCommentRow } from '../features/shared/lineComments.types';

export const lineCommentsQueryKeys = {
  counts: (submissionId: string) => ['line-comment-counts', submissionId] as const,
  line: (submissionId: string, lineCode: string) => ['line-comments', submissionId, lineCode] as const,
  openThreads: (submissionId: string) => ['line-comment-open-threads', submissionId] as const,
};

export function useLineCommentOpenCounts(submissionId: string | null | undefined) {
  return useQuery({
    queryKey: lineCommentsQueryKeys.counts(submissionId ?? ''),
    queryFn: () => fetchLineCommentOpenRootCounts(submissionId!),
    enabled: Boolean(submissionId),
    staleTime: 15_000,
  });
}

export function useOpenLineCommentsPanel(submissionId: string | null | undefined) {
  return useQuery({
    queryKey: lineCommentsQueryKeys.openThreads(submissionId ?? ''),
    queryFn: () => fetchOpenLineCommentThreads(submissionId!),
    enabled: Boolean(submissionId),
    staleTime: 15_000,
  });
}

export function useLineComments(
  submissionId: string | null | undefined,
  lineCode: string | null | undefined,
  open: boolean,
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: lineCommentsQueryKeys.line(submissionId ?? '', lineCode ?? ''),
    queryFn: async () => {
      const rows = await fetchLineComments(submissionId!, lineCode!, { includeDeleted: false });
      return rows;
    },
    enabled: Boolean(open && submissionId && lineCode),
    staleTime: 10_000,
  });

  const invalidateSubmissionLine = async () => {
    if (!submissionId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: lineCommentsQueryKeys.counts(submissionId) }),
      queryClient.invalidateQueries({ queryKey: lineCommentsQueryKeys.openThreads(submissionId) }),
      lineCode
        ? queryClient.invalidateQueries({ queryKey: lineCommentsQueryKeys.line(submissionId, lineCode) })
        : Promise.resolve(),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: async (payload: { content: string; critical?: boolean }) => {
      if (!submissionId || !lineCode) throw new Error('Submissão ou linha em falta.');
      return createLineComment({
        submissionId,
        lineCode,
        content: payload.content,
        critical: payload.critical,
      });
    },
    onSuccess: invalidateSubmissionLine,
  });

  const replyMutation = useMutation({
    mutationFn: async (payload: { parentId: string; content: string }) => {
      if (!submissionId || !lineCode) throw new Error('Submissão ou linha em falta.');
      return replyLineComment({
        submissionId,
        lineCode,
        parentId: payload.parentId,
        content: payload.content,
      });
    },
    onSuccess: invalidateSubmissionLine,
  });

  const resolveMutation = useMutation({
    mutationFn: async (payload: { rootId: string; resolved: boolean }) =>
      resolveLineCommentThread(payload.rootId, payload.resolved),
    onSuccess: invalidateSubmissionLine,
  });

  const criticalMutation = useMutation({
    mutationFn: async (payload: { rootId: string; critical: boolean }) =>
      markLineCommentCritical(payload.rootId, payload.critical),
    onSuccess: invalidateSubmissionLine,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => softDeleteLineComment(id),
    onSuccess: invalidateSubmissionLine,
  });

  const editMutation = useMutation({
    mutationFn: (payload: { id: string; content: string }) => updateLineCommentContent(payload.id, payload.content),
    onSuccess: invalidateSubmissionLine,
  });

  return {
    ...query,
    createMutation,
    replyMutation,
    resolveMutation,
    criticalMutation,
    deleteMutation,
    editMutation,
  };
}

/** Agrupa lista plana em threads ordenadas pela raíz. */
export function groupLineCommentsByThread(rows: SubmissionLineCommentRow[]): {
  root: SubmissionLineCommentRow;
  replies: SubmissionLineCommentRow[];
}[] {
  const roots = rows.filter((r) => !r.parent_id).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const byRoot = roots.map((root) => ({
    root,
    replies: rows
      .filter((r) => r.parent_id && r.thread_root_id === root.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at)),
  }));
  return byRoot;
}
