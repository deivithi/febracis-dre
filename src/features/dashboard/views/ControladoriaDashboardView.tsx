import type { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';
import type { DashboardSnapshot, FranchiseDashboardRow, NetworkDashboardRow } from '../../shared/portal.types';
import {
  formatCurrency,
  formatInteger,
  formatPercent,
  formatPeriodLabel,
  formatStatusLabel,
} from '../../../utils/formatters';
import { Card } from '../../../components/ui/card';
import { DataTable } from '../../../components/ui/DataTable';
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

  const criticalRows = useMemo(() => getCriticalFranchises(currentRows), [currentRows]);

  const criticalColumns = useMemo<ColumnDef<FranchiseDashboardRow>[]>(
    () => [
      {
        id: 'unit',
        header: 'Unidade',
        accessorFn: (r) => r.franchise_name,
        cell: ({ row }) => (
          <>
            <div className="list-row__title">{row.original.franchise_name}</div>
            <div className="list-row__meta">{row.original.regional_name}</div>
          </>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: (r) => r.submission_status,
        cell: ({ row }) => formatStatusLabel(row.original.submission_status),
      },
      {
        id: 'margem',
        header: 'Margem',
        accessorFn: (r) => r.ebitda2_pct,
        meta: { tdClassName: 'align-right num-tabular' },
        cell: ({ row }) => <span className="num-tabular">{formatPercent(row.original.ebitda2_pct)}</span>,
      },
      {
        id: 'ebitda',
        header: 'EBITDA 2',
        accessorFn: (r) => r.ebitda_2,
        meta: { tdClassName: 'align-right num-tabular' },
        cell: ({ row }) => <span className="num-tabular">{formatCurrency(row.original.ebitda_2)}</span>,
      },
    ],
    [],
  );

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
              <div className="card__body card__body--compact">
                {criticalRows.length === 0 ? (
                  <div className="inline-message">Não há unidades com DRE neste período para destacar.</div>
                ) : (
                  <DataTable<FranchiseDashboardRow>
                    columns={criticalColumns}
                    data={criticalRows}
                    getRowId={(row) => row.submission_id}
                    stickyHeader
                    virtualize={false}
                    paginated
                    pageSize={6}
                  />
                )}
              </div>
            </Card>
          </div>
        }
        sidebar={
          <div className="dashboard__side">
            <Card variant="kpi" className="card--dense">
              <div className="card__header card__header--dense">
                <h3 className="card__title">Resumo da fila de aprovações</h3>
              </div>
              <div className="card__body card__body--dense-static">
                <div className="detail-list detail-list--tight">
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

            <RecentSubmissionsCard rows={snapshot.currentSubmissions} className="card--dense" />
          </div>
        }
      />
    </div>
  );
}
