import type { LucideIcon } from 'lucide-react';
import { useId } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import './RoleCard.css';

export type RoleCardProps = {
  roleKey: string;
  title: string;
  icon: LucideIcon;
  iconClassName?: string;
  scopePill: string;
  primaryAction: string;
  bullets: string[];
  technicalDetails: string[];
};

export function RoleCard({
  roleKey,
  title,
  icon: Icon,
  iconClassName = '',
  scopePill,
  primaryAction,
  bullets,
  technicalDetails,
}: RoleCardProps) {
  const uid = useId();
  const titleId = `guide-role-${roleKey}-title-${uid}`;
  const primaryId = `guide-role-${roleKey}-primary-${uid}`;
  const describedId = `guide-role-${roleKey}-desc-${uid}`;
  const popoverHeadingId = `guide-role-${roleKey}-popover-h-${uid}`;
  const techListId = `guide-role-${roleKey}-tech-${uid}`;
  const richLabel = `${title}, escopo ${scopePill}. Ação principal: ${primaryAction}.`;

  return (
    <article className="role-card" aria-label={richLabel}>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="role-card__trigger"
            aria-labelledby={titleId}
            aria-describedby={`${primaryId} ${describedId}`}
            aria-controls={techListId}
          >
            <div className="role-card__header">
              <Icon size={24} strokeWidth={1.85} aria-hidden className={`role-card__icon ${iconClassName}`.trim()} />
              <span id={titleId} className="role-card__title typo-h4">
                {title}
              </span>
            </div>
            <span className="role-card__pill">{scopePill}</span>
            <hr className="role-card__sep" />
            <p id={primaryId} className="role-card__primary">
              {primaryAction}
            </p>
            <ul className="role-card__bullets" aria-label="Capacidades resumidas">
              {bullets.map((bullet) => (
                <li key={bullet} className="role-card__bullet typo-body-sm">
                  • {bullet}
                </li>
              ))}
            </ul>
            <span id={describedId} className="sr-only">
              Lista técnica com políticas PostgreSQL / rotas abre ao ativar este botão.
            </span>
          </button>
        </PopoverTrigger>

        <PopoverContent
          side="top"
          align="center"
          className="role-card__popover-content card"
          id={techListId}
          aria-labelledby={popoverHeadingId}
        >
          <p id={popoverHeadingId} className="role-card__popover-heading typo-h4">
            Capacidades técnicas ({title})
          </p>
          <ul className="role-card__popover-list typo-body-sm">
            {technicalDetails.map((line) => (
              <li key={`${roleKey}-${line.slice(0, 48)}`}>{line}</li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </article>
  );
}
