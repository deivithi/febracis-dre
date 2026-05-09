import * as XLSX from 'xlsx';
import type { FranchiseDashboardRow } from '../shared/portal.types';
import {
  formatStatusLabel,
  toNumber,
} from '../../utils/formatters';

const BRL_FMT = '"R$" #,##0.00';
const PCT_FMT = '0.0';

export type DashboardExcelKpiRow = {
  label: string;
  value: string;
  delta: string;
  description: string;
};

export function buildDashboardExcelBuffer(params: {
  kpis: DashboardExcelKpiRow[];
  rankingRows: FranchiseDashboardRow[];
  meta: {
    periodLabel: string;
    filters: Record<string, unknown>;
    timestampBrt: string;
    userLabel: string;
  };
}): ArrayBuffer {
  const { kpis, rankingRows, meta } = params;
  const wb = XLSX.utils.book_new();

  const kpiAoA: (string | number)[][] = [
    ['Métrica', 'Valor', 'Variação', 'Descrição'],
    ...kpis.map((k) => [k.label, k.value, k.delta, k.description]),
  ];
  const kpiSheet = XLSX.utils.aoa_to_sheet(kpiAoA);
  kpiSheet['!cols'] = [{ wch: 32 }, { wch: 18 }, { wch: 14 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, kpiSheet, 'KPIs');

  const rankHeaders = [
    'Franquia',
    'Código',
    'Regional',
    'RBV',
    'MC2',
    'EBITDA 2',
    'Margem %',
    'Status',
  ];
  const rankAoA: (string | number)[][] = [
    rankHeaders,
    ...rankingRows.map((row) => [
      row.franchise_name,
      row.franchise_code,
      row.regional_name,
      toNumber(row.gross_revenue),
      toNumber(row.mc2),
      toNumber(row.ebitda_2),
      toNumber(row.ebitda2_pct),
      formatStatusLabel(row.submission_status),
    ]),
  ];
  const rankSheet = XLSX.utils.aoa_to_sheet(rankAoA);
  rankSheet['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 18 }];

  const rankRef = rankSheet['!ref'];
  if (rankRef) {
    const rankRange = XLSX.utils.decode_range(rankRef);
    for (let r = 1; r <= rankRange.e.r; r++) {
      for (const c of [3, 4, 5] as const) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = rankSheet[addr];
        if (cell && cell.t === 'n') {
          cell.z = BRL_FMT;
        }
      }
      const pctAddr = XLSX.utils.encode_cell({ r, c: 6 });
      const pctCell = rankSheet[pctAddr];
      if (pctCell && pctCell.t === 'n') {
        pctCell.z = PCT_FMT;
      }
    }
  }
  XLSX.utils.book_append_sheet(wb, rankSheet, 'Ranking');

  const metaAoA: (string | number)[][] = [
    ['Campo', 'Valor'],
    ['Período (relatório)', meta.periodLabel],
    ['Gerado em (BRT)', meta.timestampBrt],
    ['Usuário', meta.userLabel],
    ['Filtros (JSON)', JSON.stringify(meta.filters, null, 0)],
  ];
  const metaSheet = XLSX.utils.aoa_to_sheet(metaAoA);
  metaSheet['!cols'] = [{ wch: 22 }, { wch: 72 }];
  XLSX.utils.book_append_sheet(wb, metaSheet, 'Metadados');

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}
