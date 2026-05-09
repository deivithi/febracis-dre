import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

export type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; variant?: 'primary' | 'secondary' };
  size?: 'sm' | 'md' | 'lg';
};

const sizeClass: Record<NonNullable<EmptyStateProps['size']>, string> = {
  sm: 'empty-state--size-sm',
  md: 'empty-state--size-md',
  lg: 'empty-state--size-lg',
};

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  size = 'md',
}: EmptyStateProps) {
  const sizeModifier = sizeClass[size];

  return (
    <div className={`empty-state ${sizeModifier}`}>
      <div className="empty-state__icon" aria-hidden>
        <Icon />
      </div>
      <h3 className="empty-state__title">{title}</h3>
      {description ? (
        <p className="empty-state__description page-container__subtitle">{description}</p>
      ) : null}
      {action ? (
        <button
          type="button"
          className={action.variant === 'secondary' ? 'btn btn--secondary' : 'btn btn--gold'}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
