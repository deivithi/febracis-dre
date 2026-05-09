import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../features/auth/useAuth';
import {
  fetchNotifications,
  fetchUnreadNotificationsCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../features/notifications/notifications.api';
import type { NotificationRow } from '../features/notifications/types';
import { getSupabaseClient } from '../lib/supabase';

const REFETCH_MS = 30_000;
const LIST_LIMIT = 50;

export interface NotificationsQueryResult {
  notifications: NotificationRow[];
  unread_count: number;
}

export function useNotifications() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async (): Promise<NotificationsQueryResult> => {
      if (!userId) {
        return { notifications: [], unread_count: 0 };
      }

      const [notifications, unread_count] = await Promise.all([
        fetchNotifications(userId, LIST_LIMIT),
        fetchUnreadNotificationsCount(userId),
      ]);

      return { notifications, unread_count };
    },
    enabled: Boolean(userId),
    refetchInterval: REFETCH_MS,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!userId) {
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      return;
    }

    const channel = client
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [queryClient, userId]);

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      }
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => {
      if (!userId) {
        throw new Error('Sessão inválida');
      }
      return markAllNotificationsRead(userId);
    },
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      }
    },
  });

  return {
    userId,
    ...query,
    unread_count: query.data?.unread_count ?? 0,
    notifications: query.data?.notifications ?? [],
    markRead: markReadMutation.mutateAsync,
    markAllRead: markAllReadMutation.mutateAsync,
    isMarkingRead: markReadMutation.isPending,
    isMarkingAllRead: markAllReadMutation.isPending,
  };
}
