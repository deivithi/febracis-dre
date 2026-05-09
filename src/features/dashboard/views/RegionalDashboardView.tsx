import type { ColumnDef } from '@tanstack/react-table';
import { Building2 } from 'lucide-react';
import type { DashboardSnapshot, FranchiseDashboardRow } from '../../shared/portal.types';
import {
  formatCurrency,
  formatInteger,
  formatPercent,
  formatPeriodLabel,
  formatStatusLabel,
  getStatusVariant,
} from '../../../utils/formatters';
import { Card } from '../../../components/ui/card';
import { DataTable } from '../../../components/ui/DataTable';
import { ScopeLayout } from '../components/ScopeLayout';
import { getCurrentPeriodFranchiseRows, getTopFranchises } from '../dashboardHelpers';

type Props = { snapshot: DashboardSnapshot };

export function RegionalDashboardView({ snapshot }: Props) {
  const current = snapshot.latestRegional;

  if (!current) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">
          <Building2 />
        </div>
        <h3 className="empty-state__title">Ainda não há números da regional</h3>
        <p className="empty-state__description">
          Quando as franquias da sua carteira começarem a enviar DREs, o consolidado da regional aparece aqui.
        </p>
      </div>
    );
  }

  const currentRows = getCurrentPeriodFranchiseRows(snapshot).filter(
    (row) => row.regional_id === current.regional_id,
  );

  const columns: ColumnDef<FranchiseDashboardRow>[] = [
    {
      id: 'franchise',
      header: 'Franquia',
      accessorFn: (r) => r.franchise_name,
      cell: ({ row }) => (
        <>
          <div className="list-row__title">{row.original.franchise_name}</div>
          <div className="list-row__meta">{row.original.franchise_code}</div>
        </>
      ),
    },
    {
      id: 'rbv',
      header: 'RBV',
      accessorFn: (r) => r.gross_revenue,
      meta: { tdClassName: 'align-right num-tabular' },
      cell: ({ row }) => <span className="num-tabular">{formatCurrency(row.original.gross_revenue)}</span>,
    },
    {
      id: 'ebitda',
      header: 'EBITDA 2',
      accessorFn: (r) => r.ebitda_2,
      meta: { tdClassName: 'align-right num-tabular' },
      cell: ({ row }) => <span className="num-tabular">{formatCurrency(row.original.ebitda_2)}</span>,
    },
    {
      id: 'margem',
      header: 'Margem',
      accessorFn: (r) => r.ebitda2_pct,
      meta: { tdClassName: 'align-right num-tabular' },
      cell: ({ row }) => <span className="num-tabular">{formatPercent(row.original.ebitda2_pct)}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      accessorFn: (r) => r.submission_status,
      cell: ({ row }) => (
        <span className={`status-badge status-badge--${getStatusVariant(row.original.submission_status)}`}>
          <span className="status-badge__dot" />
          {formatStatusLabel(row.original.submission_status)}
        </span>
      ),
    },
  ];

  return (
    <div className="dashboard__content">
      <ScopeLayout
        primary={
          <Card variant="hero" className="card--accent">
            <div className="card__header">
              <div>
                <h2 className="card__title">Comparativo entre franquias</h2>
                <p className="card__subtitle">{current.regional_name}</p>
              </div>
              <span className="badge badge--primary">{formatPeriodLabel(current.period_label)}</span>
            </div>
            <div className="card__body card__body--compact">
              <DataTable<FranchiseDashboardRow>
                columns={columns}
                data={currentRows}
                getRowId={(row) => row.submission_id}
                stickyHeader
                virtualize={currentRows.length > 25}
                className="regional-compare-table"
              />
            </div>
          </Card>
        }
        sidebar={
          <div className="dashboard__side">
            <Card variant="default">
              <div className="card__header">
                <h3 className="card__title">Resumo regional</h3>
              </div>
              <div className="card__body">
                <div className="detail-list">
                  <div className="detail-list__item">
                    <span className="detail-list__label">Franquias na carteira</span>
                    <span className="detail-list__value num-tabular">{formatInteger(current.total_franchises)}</span>
                  </div>
                  <div className="detail-list__item">
                    <span className="detail-list__label">Aprovadas</span>
                    <span className="detail-list__value num-tabular">{formatInteger(current.approved_count)}</span>
                  </div>
                  <div className="detail-list__item">
                    <span className="detail-list__label">Pendentes</span>
                    <span className="detail-list__value num-tabular">{formatInteger(current.pending_count)}</span>
                  </div>
                  <div className="detail-list__item">
                    <span className="detail-list__label">MC1 média</span>
                    <span className="detail-list__value num-tabular">{formatPercent(current.avg_mc1_pct)}</span>
                  </div>
                  <div className="detail-list__item">
                    <span className="detail-list__label">Marketing médio</span>
                    <span className="detail-list__value num-tabular">{formatPercent(current.avg_marketing_pct)}</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card variant="default">
              <div className="card__header">
                <h3 className="card__title">Top 5 unidades por margem</h3>
              </div>
              <div className="card__body">
                <div className="list-stack">
                  {getTopFranchises(currentRows).map((row) => (
                    <div key={row.submission_id} className="list-row">
                      <div>
                        <div className="list-row__title">{row.franchise_name}</div>
                        <div className="list-row__meta num-tabular">{formatPercent(row.ebitda2_pct)} de margem</div>
                      </div>
                      <div className="list-row__value num-tabular">{formatCurrency(row.ebitda_2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        }
      />
    </div>
  );
}
