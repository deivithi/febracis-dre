import type { ColumnDef } from '@tanstack/react-table';
import type { PendingReviewRow } from '../../shared/portal.types';
import {
  formatCurrency,
  formatInteger,
  formatPeriodLabel,
} from '../../../utils/formatters';
import { DataTable } from '../../../components/ui/DataTable';
import '../DashboardPage.css';

type Props = { rows: PendingReviewRow[] };

export function PendingReviewsCard({ rows }: Props) {
  const columns: ColumnDef<PendingReviewRow>[] = [
    {
      id: 'franchise',
      header: 'Franquia',
      accessorFn: (r) => r.franchise_name,
      cell: ({ row }) => (
        <>
          <div className="list-row__title">{row.original.franchise_name}</div>
          <div className="list-row__meta">{row.original.regional_name}</div>
        </>
      ),
    },
    {
      id: 'period',
      header: 'Período',
      accessorFn: (r) => r.period_label,
      cell: ({ getValue }) => formatPeriodLabel(String(getValue() ?? '')),
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
      id: 'pend',
      header: 'Pendências',
      accessorFn: (r) => r.open_issues_count,
      meta: { tdClassName: 'align-right num-tabular' },
      cell: ({ row }) => <span className="num-tabular">{formatInteger(row.original.open_issues_count)}</span>,
    },
  ];

  return (
    <div className="card card--v-inline">
      <div className="card__header">
        <h3 className="card__title">Fila de aprovações</h3>
        <span className="badge badge--warning">{formatInteger(rows.length)}</span>
      </div>
      <div className="card__body">
        {rows.length === 0 ? (
          <div className="inline-message inline-message--success">
            Nenhuma DRE aguardando aprovação neste momento.
          </div>
        ) : (
          <DataTable<PendingReviewRow>
            columns={columns}
            data={rows}
            getRowId={(row) => row.submission_id}
            stickyHeader
            virtualize={false}
            paginated
            pageSize={8}
            className="pending-reviews-table"
          />
        )}
      </div>
    </div>
  );
}
