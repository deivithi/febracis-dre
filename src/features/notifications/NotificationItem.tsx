import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  Inbox,
  RotateCcw,
  UserPlus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { NotificationRow, NotificationType } from './types';
import './NotificationItem.css';

const BRT = 'America/Sao_Paulo';

function resolveNavigationTarget(row: NotificationRow): string {
  const payload = row.payload as Record<string, unknown>;
  const sid =
    typeof payload.submission_id === 'string' ? (payload.submission_id as string) : null;

  switch (row.type) {
    case 'submission_returned':
    case 'submission_approved':
      return sid ? `/app/submissions?submission=${encodeURIComponent(sid)}` : '/app/submissions';
    case 'approval_pending':
    case 'approval_assigned':
      return sid ? `/app/workflow?submission=${encodeURIComponent(sid)}` : '/app/workflow';
    case 'new_period':
      return '/app/submissions';
    default:
      return '/app/dashboard';
  }
}

function titleAndDescription(
  type: NotificationType,
  payload: Record<string, unknown>,
): { title: string; description: string } {
  const period =
    typeof payload.period_label === 'string' && payload.period_label
      ? payload.period_label
      : 'competência';

  switch (type) {
    case 'submission_returned':
      return {
        title: 'Submissão devolvida',
        description: `A DRE (${period}) foi devolvida para ajuste. Revise os comentários e reenvie.`,
      };
    case 'submission_approved':
      return {
        title: 'Submissão aprovada',
        description: `A DRE (${period}) foi aprovada pela controladoria.`,
      };
    case 'approval_pending':
      return {
        title: 'Nova submissão na fila',
        description: `Existe uma DRE (${period}) aguardando revisão.`,
      };
    case 'approval_assigned':
      return {
        title: 'Aprovação atribuída',
        description: `Há um item na fila de aprovações (${period}).`,
      };
    case 'new_period':
      return {
        title: 'Nova competência aberta',
        description:
          typeof payload.period_label === 'string'
            ? `Competência ${payload.period_label} disponível para preenchimento.`
            : 'Uma nova competência foi aberta.',
      };
    default:
      return { title: 'Notificação', description: 'Atualização do portal.' };
  }
}

function TypeIcon({ type }: { type: NotificationType }) {
  const common = { size: 18, 'aria-hidden': true as const };
  switch (type) {
    case 'submission_returned':
      return <RotateCcw {...common} className="notification-item__icon notification-item__icon--warning" />;
    case 'submission_approved':
      return <CheckCircle2 {...common} className="notification-item__icon notification-item__icon--ok" />;
    case 'new_period':
      return <Calendar {...common} className="notification-item__icon notification-item__icon--muted" />;
    case 'approval_pending':
      return <ClipboardList {...common} className="notification-item__icon notification-item__icon--gold" />;
    case 'approval_assigned':
      return <UserPlus {...common} className="notification-item__icon notification-item__icon--gold" />;
    default:
      return <Inbox {...common} className="notification-item__icon" />;
  }
}

export interface NotificationItemProps {
  row: NotificationRow;
  onAfterNavigate?: () => void;
  markedRead: (id: string) => Promise<unknown>;
}

export function NotificationItem({ row, onAfterNavigate, markedRead }: NotificationItemProps) {
  const navigate = useNavigate();
  const payload = row.payload as Record<string, unknown>;
  const { title, description } = titleAndDescription(row.type, payload);
  const unread = row.read_at == null;
  const created = new Date(row.created_at);
  const relative = formatDistanceToNow(created, { addSuffix: true, locale: ptBR });
  const absoluteBrt = formatInTimeZone(created, BRT, "dd/MM/yyyy HH:mm 'BRT'");
  const target = resolveNavigationTarget(row);

  const handleClick = async () => {
    if (unread) {
      try {
        await markedRead(row.id);
      } catch {
        /* RLS ou rede: ainda navega */
      }
    }
    navigate(target);
    onAfterNavigate?.();
  };

  return (
    <button
      type="button"
      className={`notification-item ${unread ? 'notification-item--unread' : ''}`}
      onClick={() => void handleClick()}
      title={`${absoluteBrt} — clique para abrir`}
    >
      <div className="notification-item__icon-wrap">
        <TypeIcon type={row.type} />
      </div>
      <div className="notification-item__body">
        <div className="notification-item__title-row">
          <span className="notification-item__title">{title}</span>
          {unread ? <span className="notification-item__dot" aria-hidden /> : null}
        </div>
        <p className="notification-item__desc">{description}</p>
        <time className="notification-item__time" dateTime={row.created_at}>
          {relative}
        </time>
      </div>
    </button>
  );
}
