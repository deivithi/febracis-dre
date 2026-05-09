import { Sparkles, User } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import type { AgentMessageRow } from '../../shared/portal.types';
import { AssistantProse } from '../AssistantProse';
import { stripInternalLineCodesFromUserText } from '../dreAssistant';

export interface MessageItemProps {
  message: AgentMessageRow;
  lineCodes: readonly string[];
  /** Quando definido (tipicamente só na última resposta do assistente após mensagem fora do tema). */
  realignBanner?: string | null;
}

function formatBrtClock(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return formatInTimeZone(new Date(iso), 'America/Sao_Paulo', 'HH:mm');
  } catch {
    return '';
  }
}

export function MessageItem({ message, lineCodes, realignBanner }: MessageItemProps) {
  if (message.role !== 'user' && message.role !== 'assistant') {
    return null;
  }

  const isUser = message.role === 'user';
  const displayContent = isUser
    ? message.content
    : stripInternalLineCodesFromUserText(message.content, lineCodes) || message.content;

  const row = (
    <article
      className={`dre-assistant-chat__row ${isUser ? 'dre-assistant-chat__row--user' : ''}`}
      data-role={message.role}
    >
      <div className="dre-assistant-chat__avatar" aria-hidden>
        {isUser ? (
          <User size={14} strokeWidth={2} className="dre-assistant-chat__avatar-icon dre-assistant-chat__avatar-icon--user" />
        ) : (
          <Sparkles
            size={14}
            strokeWidth={2}
            className="dre-assistant-chat__avatar-icon dre-assistant-chat__avatar-icon--assistant"
          />
        )}
      </div>
      <div className="dre-assistant-chat__column">
        <div className="dre-assistant-chat__header">
          <span className="dre-assistant-chat__role-label">{isUser ? 'Você' : 'Assistente DRE'}</span>
          <time className="dre-assistant-chat__time" dateTime={message.created_at ?? undefined}>
            {formatBrtClock(message.created_at)}
          </time>
        </div>
        <div className={`dre-assistant-chat__body ${isUser ? 'dre-assistant-chat__body--user' : ''}`}>
          {isUser ? (
            <span className="dre-assistant-chat__user-plain">{displayContent}</span>
          ) : (
            <AssistantProse text={displayContent} />
          )}
        </div>
      </div>
    </article>
  );

  if (!isUser && realignBanner) {
    return (
      <div className="dre-assistant-chat__block">
        <div className="dre-assistant-chat__realign-banner" role="status">
          {realignBanner}
        </div>
        {row}
      </div>
    );
  }

  return row;
}
