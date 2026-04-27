import { AlertTriangle, CheckCircle2, FileSpreadsheet, FolderSync } from 'lucide-react';
import { formatCurrency, formatInteger } from '../../../utils/formatters';
import type { DrePreviewValues } from '../drePreview';

type SubmissionKpiSectionProps = {
  totalCount: number;
  approvedCount: number;
  pendingCount: number;
  preview: DrePreviewValues;
};

/**
 * Faixa de KPIs (resumo + secção colapsável).
 */
export function SubmissionKpiSection({ totalCount, approvedCount, pendingCount, preview }: SubmissionKpiSectionProps) {
  return (
    <div className="submissions-kpi-wrap submissions-kpi-wrap--tiered">
      <div className="submissions-kpi-primary kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__header">
            <span className="kpi-card__label">Submissões no seu escopo</span>
            <div className="kpi-card__icon">
              <FileSpreadsheet />
            </div>
          </div>
          <div className="kpi-card__value">{formatInteger(totalCount)}</div>
          <div className="kpi-card__footer">
            <span className="kpi-card__percent">Versões correntes listadas</span>
          </div>
        </div>

        <div className="kpi-card kpi-card--gold">
          <div className="kpi-card__header">
            <span className="kpi-card__label">EBITDA 2 (preview)</span>
            <div className="kpi-card__icon">
              <FolderSync />
            </div>
          </div>
          <div className="kpi-card__value kpi-card__value--gold">{formatCurrency(preview.ebitda2)}</div>
          <div className="kpi-card__footer">
            <span className="kpi-card__percent">Motor local alinhado aos inputs do rascunho</span>
          </div>
        </div>
      </div>

      <details className="submissions-kpi-more">
        <summary className="submissions-kpi-more__summary">Mais indicadores do período</summary>
        <div className="submissions-kpi-more__grid kpi-grid">
          <div className="kpi-card kpi-card--success">
            <div className="kpi-card__header">
              <span className="kpi-card__label">Aprovadas</span>
              <div className="kpi-card__icon">
                <CheckCircle2 />
              </div>
            </div>
            <div className="kpi-card__value kpi-card__value--success">{formatInteger(approvedCount)}</div>
            <div className="kpi-card__footer">
              <span className="kpi-card__percent">Status finalizado</span>
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
              <span className="kpi-card__percent">Envio, revisão ou ajuste</span>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
