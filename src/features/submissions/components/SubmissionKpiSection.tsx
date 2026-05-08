import { AlertTriangle, CheckCircle2, FileSpreadsheet, TrendingUp } from 'lucide-react';
import { formatCurrency, formatInteger } from '../../../utils/formatters';
import type { DrePreviewValues } from '../drePreview';

type SubmissionKpiSectionProps = {
  totalCount: number;
  approvedCount: number;
  pendingCount: number;
  preview: DrePreviewValues;
};

/**
 * Faixa de indicadores no topo da página: dois cartões executivos sempre visíveis
 * + cartões secundários em disclosure. Linguagem alinhada ao Resumo da DRE no rail.
 */
export function SubmissionKpiSection({ totalCount, approvedCount, pendingCount, preview }: SubmissionKpiSectionProps) {
  return (
    <div className="submissions-kpi-wrap submissions-kpi-wrap--tiered">
      <div className="submissions-kpi-primary kpi-grid">
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

        <div className="kpi-card kpi-card--gold">
          <div className="kpi-card__header">
            <span className="kpi-card__label">EBITDA 2 da prévia</span>
            <div className="kpi-card__icon">
              <TrendingUp />
            </div>
          </div>
          <div className="kpi-card__value kpi-card__value--gold">{formatCurrency(preview.ebitda2)}</div>
          <div className="kpi-card__footer">
            <span className="kpi-card__percent">Resultado calculado com os valores em edição</span>
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
