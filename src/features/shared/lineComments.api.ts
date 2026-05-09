import { supabase } from '../../lib/supabase';
import type { SubmissionLineCommentRow } from './lineComments.types';

const EVENT_CREATED = 'submission_line_comment.created';
const EVENT_REPLY = 'submission_line_comment.reply';

async function enqueueLineCommentNotification(eventType: string, payload: Record<string, unknown>) {
  try {
    const { error } = await supabase.rpc('fn_enqueue_notification_outbox', {
      p_event_type: eventType,
      p_payload: payload,
    });
    if (error) {
      console.warn('[U07] Falha ao enfileirar notificação (pré‑requisito U07):', error.message);
    }
  } catch (e) {
    console.warn('[U07] notification_outbox indisponível:', e);
  }
}

/** Contagem de tópicos abertos por linha (badges na grelha). */
export async function fetchLineCommentOpenRootCounts(submissionId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('submission_line_comments')
    .select('line_code')
    .eq('submission_id', submissionId)
    .is('parent_id', null)
    .is('deleted_at', null)
    .eq('resolved', false);

  if (error) {
    throw new Error(`Não foi possível carregar contagens de comentários. ${error.message}`);
  }

  const acc: Record<string, number> = {};
  for (const row of data ?? []) {
    const code = (row as { line_code: string }).line_code;
    acc[code] = (acc[code] ?? 0) + 1;
  }
  return acc;
}

export async function fetchLineComments(
  submissionId: string,
  lineCode: string,
  options?: { includeDeleted?: boolean },
): Promise<SubmissionLineCommentRow[]> {
  let q = supabase
    .from('submission_line_comments')
    .select('*')
    .eq('submission_id', submissionId)
    .eq('line_code', lineCode)
    .order('created_at', { ascending: true });

  if (!options?.includeDeleted) {
    q = q.is('deleted_at', null);
  }

  const { data, error } = await q;

  if (error) {
    throw new Error(`Não foi possível carregar comentários da linha. ${error.message}`);
  }

  return (data ?? []) as SubmissionLineCommentRow[];
}

/** Threads raíz abertas (não resolvidas) com crítico — para painel lateral. */
export async function fetchOpenLineCommentThreads(submissionId: string): Promise<SubmissionLineCommentRow[]> {
  const { data, error } = await supabase
    .from('submission_line_comments')
    .select('*')
    .eq('submission_id', submissionId)
    .is('parent_id', null)
    .is('deleted_at', null)
    .eq('resolved', false)
    .order('critical', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Não foi possível carregar pontos abertos por linha. ${error.message}`);
  }

  return (data ?? []) as SubmissionLineCommentRow[];
}

export async function createLineComment(payload: {
  submissionId: string;
  lineCode: string;
  content: string;
  critical?: boolean;
}): Promise<SubmissionLineCommentRow> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) {
    throw new Error('Sessão indisponível para publicar comentário.');
  }

  const { data, error } = await supabase
    .from('submission_line_comments')
    .insert({
      submission_id: payload.submissionId,
      line_code: payload.lineCode,
      author_id: uid,
      content: payload.content.trim(),
      resolved: false,
      critical: Boolean(payload.critical),
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Não foi possível criar o comentário. ${error?.message ?? 'sem dados'}`);
  }

  const row = data as SubmissionLineCommentRow;
  await enqueueLineCommentNotification(EVENT_CREATED, {
    submission_id: row.submission_id,
    line_code: row.line_code,
    comment_id: row.id,
    author_id: row.author_id,
  });
  return row;
}

export async function replyLineComment(payload: {
  submissionId: string;
  lineCode: string;
  parentId: string;
  content: string;
}): Promise<SubmissionLineCommentRow> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) {
    throw new Error('Sessão indisponível para responder.');
  }

  const { data, error } = await supabase
    .from('submission_line_comments')
    .insert({
      submission_id: payload.submissionId,
      line_code: payload.lineCode,
      author_id: uid,
      parent_id: payload.parentId,
      content: payload.content.trim(),
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Não foi possível responder. ${error?.message ?? 'sem dados'}`);
  }

  const row = data as SubmissionLineCommentRow;
  await enqueueLineCommentNotification(EVENT_REPLY, {
    submission_id: row.submission_id,
    line_code: row.line_code,
    comment_id: row.id,
    parent_id: payload.parentId,
    author_id: row.author_id,
  });
  return row;
}

export async function resolveLineCommentThread(rootId: string, resolved: boolean): Promise<void> {
  const session = await supabase.auth.getSession();
  const uid = session.data.session?.user?.id ?? null;
  if (!uid) throw new Error('Sessão indisponível.');

  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from('submission_line_comments')
    .update(
      resolved
        ? {
            resolved: true,
            resolved_by: uid,
            resolved_at: nowIso,
          }
        : {
            resolved: false,
            resolved_by: null,
            resolved_at: null,
          },
    )
    .eq('id', rootId);

  if (error) {
    throw new Error(`Não foi possível actualizar resolução. ${error.message}`);
  }
}

export async function markLineCommentCritical(rootId: string, critical: boolean): Promise<void> {
  const { error } = await supabase.from('submission_line_comments').update({ critical }).eq('id', rootId);

  if (error) {
    throw new Error(`Não foi possível atualizar marca crítico. ${error.message}`);
  }
}

export async function softDeleteLineComment(id: string): Promise<void> {
  const nowIso = new Date().toISOString();
  const { error } = await supabase.from('submission_line_comments').update({ deleted_at: nowIso }).eq('id', id);

  if (error) {
    throw new Error(`Não foi possível remover o comentário. ${error.message}`);
  }
}

export async function updateLineCommentContent(id: string, content: string): Promise<void> {
  const { error } = await supabase
    .from('submission_line_comments')
    .update({ content: content.trim() })
    .eq('id', id);

  if (error) {
    throw new Error(`Não foi possível editar o comentário. ${error.message}`);
  }
}
