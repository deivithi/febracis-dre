import { PencilLine } from 'lucide-react';
import type { EventOptionRow, FranchiseListRow, ReportingPeriodRow } from '../../shared/portal.types';
import { formatPeriodLabel, formatStatusLabel } from '../../../utils/formatters';

type SubmissionToolbarProps = {
  resolvedFranchiseId: string;
  resolvedPeriodId: string;
  effectiveEventId: string;
  franchiseRows: FranchiseListRow[];
  periodRows: ReportingPeriodRow[];
  eventRows: EventOptionRow[] | undefined;
  currentSubmissionLocked: boolean;
  canPrepareDraft: boolean;
  draftActionLabel: string;
  onFranchiseChange: (id: string) => void;
  onPeriodChange: (id: string) => void;
  onEventChange: (id: string) => void;
  onCreateDraft: () => void;
  isCreatingDraft: boolean;
};

/**
 * Seletores de franquia, competência, evento e ação "Criar/Abrir rascunho" (hero compacto).
 */
export function SubmissionToolbar({
  resolvedFranchiseId,
  resolvedPeriodId,
  effectiveEventId,
  franchiseRows,
  periodRows,
  eventRows,
  currentSubmissionLocked,
  canPrepareDraft,
  draftActionLabel,
  onFranchiseChange,
  onPeriodChange,
  onEventChange,
  onCreateDraft,
  isCreatingDraft,
}: SubmissionToolbarProps) {
  return (
    <section className="submission-hero submission-hero--compact card card--gold" data-testid="submission-hero-toolbar">
      <div className="submission-hero__compact-top">
        <span className="badge badge--gold">DRE</span>
        <p className="submission-hero__compact-tagline">
          Dados e MC/EBITDA vêm do assistente e do motor oficial; use o rascunho antes de enviar à controladoria.
        </p>
      </div>

      <div className="submission-hero__toolbar glass">
        <div className="form-group">
          <label className="form-label" htmlFor="submission-franchise">
            Franquia
          </label>
          <select
            id="submission-franchise"
            data-testid="submission-franchise"
            className="form-select"
            value={resolvedFranchiseId}
            onChange={(event) => onFranchiseChange(event.target.value)}
          >
            {franchiseRows.map((franchise) => (
              <option key={franchise.id} value={franchise.id}>
                {franchise.trade_name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="submission-period">
            Competência
          </label>
          <select
            id="submission-period"
            data-testid="submission-period"
            className="form-select"
            value={resolvedPeriodId}
            onChange={(event) => onPeriodChange(event.target.value)}
          >
            {periodRows.map((period) => (
              <option key={period.id} value={period.id}>
                {formatPeriodLabel(period.label)} • {formatStatusLabel(period.status)}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="submission-event">
            Evento
          </label>
          <select
            id="submission-event"
            data-testid="submission-event"
            className="form-select"
            value={effectiveEventId}
            onChange={(event) => onEventChange(event.target.value)}
            disabled={!eventRows?.length || currentSubmissionLocked}
          >
            <option value="">Sem evento vinculado</option>
            {eventRows?.map((eventOption) => (
              <option key={eventOption.id} value={eventOption.id}>
                {eventOption.name}
              </option>
            ))}
          </select>
        </div>

        <div className="submission-hero__actions">
          <button
            type="button"
            data-testid="submission-create-draft"
            className="btn btn--gold"
            onClick={onCreateDraft}
            disabled={!canPrepareDraft || isCreatingDraft}
          >
            <PencilLine size={18} />
            {draftActionLabel}
          </button>

          {currentSubmissionLocked ? (
            <div className="inline-message">
              A submissão corrente deste período já está em aprovação. O franqueado não pode criar nova versão nem reenviar até
              uma devolução formal para ajuste.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
