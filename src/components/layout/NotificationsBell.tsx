import * as Popover from '@radix-ui/react-popover';
import { Bell } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationsPanel } from '../../features/notifications/NotificationsPanel';
import './NotificationsBell.css';

export function NotificationsBell() {
  const {
    userId,
    notifications,
    unread_count: unreadCount,
    markRead,
    markAllRead,
    isMarkingAllRead,
    isLoading,
  } = useNotifications();
  const [open, setOpen] = useState(false);

  const handleMarkAll = useCallback(async () => {
    await markAllRead();
  }, [markAllRead]);

  if (!userId) {
    return null;
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="notifications-bell app-header__icon-btn"
          id="btn-notifications"
          data-tour-id="notifications-bell"
          aria-label="Abrir notificações"
          title="Notificações"
        >
          <Bell aria-hidden className="notifications-bell__icon" />
          {unreadCount > 0 ? (
            <span className="notifications-bell__badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
          {isLoading ? <span className="visually-hidden">Carregando notificações</span> : null}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="notifications-bell__popover"
          sideOffset={8}
          align="end"
          collisionPadding={16}
        >
          <NotificationsPanel
            notifications={notifications}
            markedRead={markRead}
            onMarkAllRead={handleMarkAll}
            isMarkingAllRead={isMarkingAllRead}
            onClose={() => setOpen(false)}
          />
          <Popover.Arrow className="notifications-bell__arrow" width={12} height={6} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
