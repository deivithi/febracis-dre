import type { DashboardSnapshot, FranchiseDashboardRow, NetworkDashboardRow } from '../../shared/portal.types';
import {
  formatCurrency,
  formatInteger,
  formatPercent,
  formatPeriodLabel,
  formatStatusLabel,
} from '../../../utils/formatters';
import { Card } from '../../../components/ui/card';
import { ScopeLayout } from '../components/ScopeLayout';
import { PendingReviewsCard } from '../components/PendingReviewsCard';
import { RecentSubmissionsCard } from '../components/RecentSubmissionsCard';
import { getCriticalFranchises, getCurrentPeriodFranchiseRows } from '../dashboardHelpers';

type Props = {
  snapshot: DashboardSnapshot;
  networkRow?: NetworkDashboardRow | null;
  franchiseRowsForCritical?: FranchiseDashboardRow[];
};

export function ControladoriaDashboardView({
  snapshot,
  networkRow: networkRowProp,
  franchiseRowsForCritical,
}: Props) {
  const current = networkRowProp ?? snapshot.latestNetwork;
  const currentRows = franchiseRowsForCritical ?? getCurrentPeriodFranchiseRows(snapshot);

  return (
    <div className="dashboard__content page-stack">
      <ScopeLayout
        primary={
          <div className="page-stack scope-primary-stack">
            <PendingReviewsCard rows={snapshot.pendingReviews} />

            <Card variant="default">
              <div className="card__header">
                <div>
                  <h2 className="card__title">Unidades com menor margem (EBITDA 2)</h2>
                  <p className="card__subtitle">
                    Priorize a revisão de quem está com margem baixa ou pendências em aberto.
                  </p>
                </div>
              </div>
              <div className="card__body">
                <div className="list-stack">
                  {getCriticalFranchises(currentRows).map((row) => (
                    <div key={`${row.submission_id}-review`} className="list-row">
                      <div>
                        <div className="list-row__title">{row.franchise_name}</div>
                        <div className="list-row__meta">
                          {row.regional_name} • {formatStatusLabel(row.submission_status)}
                        </div>
                      </div>
                      <div className="list-row__value">
                        <div className="num-tabular">{formatPercent(row.ebitda2_pct)}</div>
                        <div className="list-row__meta num-tabular">{formatCurrency(row.ebitda_2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        }
        sidebar={
          <div className="dashboard__side">
            <Card variant="kpi">
              <div className="card__header">
                <h3 className="card__title">Resumo da fila de aprovações</h3>
              </div>
              <div className="card__body">
                <div className="detail-list">
                  <div className="detail-list__item">
                    <span className="detail-list__label">DREs aguardando aprovação</span>
                    <span className="detail-list__value">{formatInteger(snapshot.pendingReviews.length)}</span>
                  </div>
                  <div className="detail-list__item">
                    <span className="detail-list__label">DREs aprovadas</span>
                    <span className="detail-list__value">{formatInteger(current?.approved_count ?? 0)}</span>
                  </div>
                  <div className="detail-list__item">
                    <span className="detail-list__label">Pontos abertos</span>
                    <span className="detail-list__value">
                      {formatInteger(
                        snapshot.pendingReviews.reduce(
                          (total, row) => total + Number(row.open_issues_count ?? 0),
                          0,
                        ),
                      )}
                    </span>
                  </div>
                  <div className="detail-list__item">
                    <span className="detail-list__label">Competência</span>
                    <span className="detail-list__value">
                      {formatPeriodLabel(current?.period_label ?? null)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            <RecentSubmissionsCard rows={snapshot.currentSubmissions} />
          </div>
        }
      />
    </div>
  );
}
