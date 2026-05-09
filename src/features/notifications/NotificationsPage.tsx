import { useMemo } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { useBreadcrumb } from '../../layouts/app/BreadcrumbContext';
import { NotificationItem } from './NotificationItem';
import './NotificationsPage.css';
import './NotificationsPage.css';

export function NotificationsPage() {
  const { notifications, userId, markRead, markAllRead, isMarkingAllRead, isLoading, error } =
    useNotifications();

  const notificationsBreadcrumbSegments = useMemo(() => {
    if (!userId || isLoading || error) {
      return [];
    }
    return [
      { label: 'Portal', href: '/app/dashboard' },
      { label: 'Notificações', href: '/app/notifications' },
      { label: `${notifications.length} aviso(s)` },
    ];
  }, [userId, isLoading, error, notifications.length]);

  useBreadcrumb(notificationsBreadcrumbSegments);

  if (!userId) {
    return (
      <div className="page-stack">
        <p className="inline-message">Inicie sessão para ver as notificações.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="skeleton skeleton--card" />;
  }

  if (error) {
    return (
      <div className="page-stack">
        <div className="inline-message inline-message--danger">
          Não foi possível carregar as notificações. Tente novamente.
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack notifications-page">
      <div className="page-container__title-bar">
        <div>
          <h1 className="page-container__title">Notificações</h1>
          <p className="page-container__subtitle">Histórico de avisos do portal e da fila de aprovação.</p>
        </div>
        <button
          type="button"
          className="btn btn--secondary"
          disabled={isMarkingAllRead || notifications.length === 0}
          onClick={() => void markAllRead()}
        >
          Marcar todas como lidas
        </button>
      </div>

      <div className="card">
        <div className="card__body notifications-page__list">
          {notifications.length === 0 ? (
            <p className="notifications-page__empty">Nenhuma notificação registada.</p>
          ) : (
            notifications.map((row) => <NotificationItem key={row.id} row={row} markedRead={markRead} />)
          )}
        </div>
      </div>
    </div>
  );
}
