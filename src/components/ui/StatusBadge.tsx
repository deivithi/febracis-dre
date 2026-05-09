import { formatStatusLabel, getStatusVariant } from '../../utils/formatters';

type StatusBadgeProps = {
  status: string | null | undefined;
};

/** Status de submissão / fluxo — mesmo padrão visual usado em `SubmissionsScopeTable`. */
export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge--${getStatusVariant(status)}`}>
      <span className="status-badge__dot" aria-hidden />
      {formatStatusLabel(status)}
    </span>
  );
}
