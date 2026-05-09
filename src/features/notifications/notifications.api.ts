import { supabase } from '../../lib/supabase';
import { notificationRowSchema, type NotificationRow } from './types';

function parseRows(rows: unknown[]): NotificationRow[] {
  const out: NotificationRow[] = [];
  for (const row of rows) {
    const parsed = notificationRowSchema.safeParse(row);
    if (parsed.success) {
      out.push(parsed.data);
    }
  }
  return out;
}

export async function fetchNotifications(userId: string, limit = 50): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, type, payload, read_at, created_at')
    .eq('user_id', userId)
    .order('read_at', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Não foi possível carregar as notificações. ${error.message}`);
  }

  return parseRows(data ?? []);
}

export async function fetchUnreadNotificationsCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) {
    throw new Error(`Não foi possível contar notificações não lidas. ${error.message}`);
  }

  return count ?? 0;
}

export async function markNotificationRead(
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    throw new Error(`Não foi possível marcar como lida. ${error.message}`);
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) {
    throw new Error(`Não foi possível marcar todas como lidas. ${error.message}`);
  }
}
