import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import type { NotificationRow } from './types';
import { NotificationItem } from './NotificationItem';
import './NotificationsPanel.css';

export interface NotificationsPanelProps {
  notifications: NotificationRow[];
  onMarkAllRead: () => Promise<unknown>;
  isMarkingAllRead: boolean;
  markedRead: (id: string) => Promise<unknown>;
  onClose?: () => void;
}

export function NotificationsPanel({
  notifications,
  onMarkAllRead,
  isMarkingAllRead,
  markedRead,
  onClose,
}: NotificationsPanelProps) {
  const latest = notifications.slice(0, 10);

  return (
    <div className="notifications-panel">
      <div className="notifications-panel__header">
        <h2 className="notifications-panel__heading">Notificações</h2>
        <button
          type="button"
          className="notifications-panel__mark-all"
          disabled={isMarkingAllRead || notifications.length === 0}
          onClick={() => void onMarkAllRead()}
        >
          {isMarkingAllRead ? (
            <>
              <Loader2 className="notifications-panel__spinner" size={14} aria-hidden />
              Marcando…
            </>
          ) : (
            'Marcar todas como lidas'
          )}
        </button>
      </div>

      <div className="notifications-panel__list">
        {latest.length === 0 ? (
          <div className="notifications-panel__empty">
            <p>Nenhuma notificação por aqui.</p>
            <p className="notifications-panel__empty-hint">Novos avisos aparecem quando a DRE avança no fluxo.</p>
          </div>
        ) : (
          latest.map((row) => (
            <NotificationItem
              key={row.id}
              row={row}
              markedRead={markedRead}
              onAfterNavigate={onClose}
            />
          ))
        )}
      </div>

      <div className="notifications-panel__footer">
        <Link to="/app/notifications" className="notifications-panel__link" onClick={onClose}>
          Ver todas
        </Link>
      </div>
    </div>
  );
}
