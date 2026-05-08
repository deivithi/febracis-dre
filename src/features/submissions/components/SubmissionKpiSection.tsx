import { AlertTriangle, CheckCircle2, ClipboardList, FileSpreadsheet, TrendingUp } from 'lucide-react';
import { formatCurrency, formatInteger } from '../../../utils/formatters';
import type { DrePreviewValues } from '../drePreview';
import type { SubmissionDraftValidation } from '../submissionValidation';

type DraftGridSummary = Pick<SubmissionDraftValidation, 'filledCount' | 'totalInputs'>;

type SubmissionKpiSectionProps = {
  totalCount: number;
  approvedCount: number;
  pendingCount: number;
  preview: DrePreviewValues;
  draftSummary: DraftGridSummary;
};

function gridFillAriaLabel(summary: DraftGridSummary): string {
  if (!summary.totalInputs) {
    return 'Preenchimento da grelha: sem linhas editáveis no contexto atual';
  }
  return `Preenchimento da grelha: ${summary.filledCount} de ${summary.totalInputs} campos preenchidos`;
}

/**
 * Faixa executiva no topo: escopo da rede + preenchimento da grelha ativa + EBITDA 2 da prévia.
 * Cartões secundários permanecem no disclosure “Mais indicadores”.
 */
export function SubmissionKpiSection({
  totalCount,
  approvedCount,
  pendingCount,
  preview,
  draftSummary,
}: SubmissionKpiSectionProps) {
  const { filledCount, totalInputs } = draftSummary;
  const cappedFilled = totalInputs > 0 ? Math.min(filledCount, totalInputs) : 0;
  const percentFilled =
    totalInputs > 0 ? Math.round((cappedFilled / totalInputs) * 100) : null;

  return (
    <div className="submissions-kpi-wrap submissions-kpi-wrap--tiered">
      <div
        className="submissions-kpi-primary kpi-grid"
        role="group"
        aria-label="Indicadores principais do workspace de submissões"
      >
        <div className="kpi-card">
          <div className="kpi-card__header">
            <span className="kpi-card__label">Submissões neste escopo</span>
            <div className="kpi-card__icon">
              <FileSpreadsheet />
            </div>
          </div>
          <div className="kpi-card__value">{formatInteger(totalCount)}</div>
          <div className="kpi-card__footer">
            <span className="kpi-card__percent">Total de DREs correntes da rede no seu acesso</span>
          </div>
        </div>

        <div
          className="kpi-card"
          role="group"
          aria-label={gridFillAriaLabel(draftSummary)}
        >
          <div className="kpi-card__header">
            <span className="kpi-card__label">Preenchimento da grelha</span>
            <div className="kpi-card__icon">
              <ClipboardList />
            </div>
          </div>
          {totalInputs > 0 ? (
            <>
              <div className="kpi-card__value">
                {formatInteger(cappedFilled)} / {formatInteger(totalInputs)}
              </div>
              <div className="kpi-card__footer">
                <span className="kpi-card__percent">
                  {percentFilled}% dos campos com valor • prévia atualiza ao editar
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="kpi-card__value kpi-card__value--placeholder">—</div>
              <div className="kpi-card__footer">
                <span className="kpi-card__percent">
                  Sem grelha ativa — selecione franquia, competência e um rascunho
                </span>
              </div>
            </>
          )}
        </div>

        <div className="kpi-card kpi-card--gold">
          <div className="kpi-card__header">
            <span className="kpi-card__label">EBITDA 2 da prévia</span>
            <div className="kpi-card__icon">
              <TrendingUp />
            </div>
          </div>
          <div className="kpi-card__value kpi-card__value--gold">{formatCurrency(preview.ebitda2)}</div>
          <div className="kpi-card__footer">
            <span className="kpi-card__percent">
              MC2 → impostos: resultado final da prévia em edição
            </span>
          </div>
        </div>
      </div>

      <details className="submissions-kpi-more">
        <summary className="submissions-kpi-more__summary">Mais indicadores do período</summary>
        <div className="submissions-kpi-more__grid kpi-grid">
          <div className="kpi-card kpi-card--success">
            <div className="kpi-card__header">
              <span className="kpi-card__label">DREs aprovadas</span>
              <div className="kpi-card__icon">
                <CheckCircle2 />
              </div>
            </div>
            <div className="kpi-card__value kpi-card__value--success">{formatInteger(approvedCount)}</div>
            <div className="kpi-card__footer">
              <span className="kpi-card__percent">Fechadas pela controladoria</span>
            </div>
          </div>

          <div className="kpi-card kpi-card--warning">
            <div className="kpi-card__header">
              <span className="kpi-card__label">Em tratamento</span>
              <div className="kpi-card__icon">
                <AlertTriangle />
              </div>
            </div>
            <div className="kpi-card__value">{formatInteger(pendingCount)}</div>
            <div className="kpi-card__footer">
              <span className="kpi-card__percent">Aguardando envio, revisão ou ajuste</span>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
