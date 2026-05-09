import type { SortingState } from '@tanstack/react-table';
import type { DataTableUrlSortConfig } from '../../components/ui/DataTable';

export const WORKFLOW_INITIAL_SORT: SortingState = [{ id: 'submitted_at', desc: true }];

export const WORKFLOW_URL_SORT: DataTableUrlSortConfig = {
  columnIdToSortParam: {
    franchise_name: 'franchise_name',
    regional_name: 'regional_name',
    period_label: 'period_label',
    gross_revenue: 'receita',
    ebitda_2: 'ebitda_2',
    open_issues_count: 'open_issues_count',
    submission_status: 'submission_status',
    submitted_at: 'enviada_em',
  },
};
